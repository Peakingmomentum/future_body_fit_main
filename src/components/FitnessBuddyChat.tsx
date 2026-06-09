import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useFitnessBuddy, Personality } from '@/hooks/useFitnessBuddy';
import { Bot, Send, Trash2, Loader2, Smile, Zap, Shield } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const personalityConfig: Record<Personality, { label: string; icon: React.ReactNode; description: string }> = {
  calm: {
    label: 'Calm',
    icon: <Smile className="w-4 h-4" />,
    description: 'Supportive & patient',
  },
  motivational: {
    label: 'Hype',
    icon: <Zap className="w-4 h-4" />,
    description: 'Energetic & upbeat',
  },
  drill: {
    label: 'Drill',
    icon: <Shield className="w-4 h-4" />,
    description: 'Tough love',
  },
  balanced: {
    label: 'Balanced',
    icon: <Bot className="w-4 h-4" />,
    description: 'Best of both',
  },
};

export function FitnessBuddyChat() {
  const {
    messages,
    isLoading,
    isFetching,
    personality,
    setPersonality,
    sendMessage,
    clearHistory,
  } = useFitnessBuddy();

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="w-5 h-5 text-primary" />
            AI Fitness Buddy
          </CardTitle>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {/* Personality Toggle */}
        <div className="mt-2">
          <ToggleGroup
            type="single"
            value={personality}
            onValueChange={(value) => value && setPersonality(value as Personality)}
            className="justify-start flex-wrap gap-1"
          >
            {Object.entries(personalityConfig).map(([key, config]) => (
              <ToggleGroupItem
                key={key}
                value={key}
                size="sm"
                className="text-xs px-2 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                title={config.description}
              >
                {config.icon}
                <span className="ml-1">{config.label}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Messages Area */}
        <ScrollArea className="h-[300px] pr-3" ref={scrollRef}>
          {isFetching ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Bot className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">Hey there! I'm your AI Fitness Buddy.</p>
              <p className="text-xs mt-1">Ask me anything about workouts, nutrition, or motivation!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 rounded-lg px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your fitness buddy..."
            className="min-h-[44px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
