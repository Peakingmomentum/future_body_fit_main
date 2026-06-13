import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { useToast } from '@/hooks/use-toast';

export type Personality = 'calm' | 'motivational' | 'drill' | 'balanced';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  personality: Personality;
  created_at: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fitness-buddy`;

export function useFitnessBuddy() {
  const { user } = useAuth();
  const { org } = useOrg();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [personality, setPersonality] = useState<Personality>('balanced');

  // Load messages from database
  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      setIsFetching(true);
      const { data, error } = await supabase
        .from('fitness_buddy_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else if (data) {
        setMessages(data.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          personality: (msg.personality || 'balanced') as Personality,
          created_at: msg.created_at,
        })));
        // Set personality from last message if exists
        if (data.length > 0) {
          const lastPersonality = data[data.length - 1].personality;
          if (lastPersonality) {
            setPersonality(lastPersonality as Personality);
          }
        }
      }
      setIsFetching(false);
    };

    fetchMessages();
  }, [user]);

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('fitness_buddy_messages')
      .insert({
        user_id: user.id,
        role,
        content,
        personality,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving message:', error);
      return null;
    }
    return data;
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      personality,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message
    const savedUserMsg = await saveMessage('user', content.trim());
    if (savedUserMsg) {
      userMessage.id = savedUserMsg.id;
    }

    let assistantContent = '';
    const assistantId = crypto.randomUUID();

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.id === assistantId) {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, {
          id: assistantId,
          role: 'assistant' as const,
          content: assistantContent,
          personality,
          created_at: new Date().toISOString(),
        }];
      });
    };

    try {
      const allMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          personality,
          brandVoice: org?.branding?.brand_voice,
        }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const chunk = parsed.choices?.[0]?.delta?.content;
            if (chunk) updateAssistant(chunk);
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Save assistant message
      if (assistantContent) {
        await saveMessage('assistant', assistantContent);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
      // Remove the incomplete assistant message if error
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  }, [user, org, messages, personality, isLoading, toast]);

  const clearHistory = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from('fitness_buddy_messages')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing history:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear chat history',
        variant: 'destructive',
      });
    } else {
      setMessages([]);
      toast({
        title: 'History cleared',
        description: 'Your chat history has been deleted',
      });
    }
  }, [user, toast]);

  return {
    messages,
    isLoading,
    isFetching,
    personality,
    setPersonality,
    sendMessage,
    clearHistory,
  };
}
