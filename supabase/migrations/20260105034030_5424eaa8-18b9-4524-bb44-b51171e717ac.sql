-- Create exercises library table for consistent video generation
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  target_muscles TEXT[],
  equipment TEXT DEFAULT 'bodyweight',
  difficulty TEXT DEFAULT 'beginner',
  video_url TEXT,
  video_status TEXT DEFAULT 'pending',
  trainer_reference_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Public read access for exercises (they're shared content)
CREATE POLICY "Exercises are publicly viewable" 
ON public.exercises 
FOR SELECT 
USING (true);

-- Only service role can modify (admin only via edge functions)
CREATE POLICY "Service role can manage exercises" 
ON public.exercises 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_exercises_updated_at
BEFORE UPDATE ON public.exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with 50+ common exercises
INSERT INTO public.exercises (name, description, target_muscles, equipment, difficulty) VALUES
-- Chest Exercises
('Push-ups', 'Classic bodyweight chest exercise with hands shoulder-width apart', ARRAY['Chest', 'Triceps', 'Shoulders'], 'bodyweight', 'beginner'),
('Wide Push-ups', 'Push-up variation with hands placed wider than shoulders', ARRAY['Chest', 'Shoulders'], 'bodyweight', 'beginner'),
('Diamond Push-ups', 'Push-up with hands forming a diamond shape under chest', ARRAY['Triceps', 'Chest'], 'bodyweight', 'intermediate'),
('Incline Push-ups', 'Push-up with hands elevated on a bench or step', ARRAY['Lower Chest', 'Triceps'], 'bodyweight', 'beginner'),
('Decline Push-ups', 'Push-up with feet elevated for upper chest focus', ARRAY['Upper Chest', 'Shoulders'], 'bodyweight', 'intermediate'),
('Bench Press', 'Barbell press lying on flat bench', ARRAY['Chest', 'Triceps', 'Shoulders'], 'barbell', 'intermediate'),
('Dumbbell Chest Press', 'Pressing dumbbells while lying on bench', ARRAY['Chest', 'Triceps'], 'dumbbells', 'beginner'),
('Dumbbell Flyes', 'Arcing motion with dumbbells for chest isolation', ARRAY['Chest'], 'dumbbells', 'intermediate'),
('Cable Crossover', 'Cable machine exercise for chest isolation', ARRAY['Chest'], 'cables', 'intermediate'),

-- Back Exercises
('Pull-ups', 'Classic overhand grip vertical pulling exercise', ARRAY['Lats', 'Biceps', 'Back'], 'pull-up bar', 'intermediate'),
('Chin-ups', 'Underhand grip vertical pulling exercise', ARRAY['Biceps', 'Lats', 'Back'], 'pull-up bar', 'intermediate'),
('Inverted Rows', 'Horizontal pulling with body under a bar', ARRAY['Back', 'Biceps', 'Rear Delts'], 'bodyweight', 'beginner'),
('Bent Over Rows', 'Barbell rowing motion while bent at hips', ARRAY['Back', 'Biceps', 'Lats'], 'barbell', 'intermediate'),
('Dumbbell Rows', 'Single-arm rowing with dumbbell and bench support', ARRAY['Lats', 'Biceps', 'Back'], 'dumbbells', 'beginner'),
('Lat Pulldown', 'Cable machine vertical pulling exercise', ARRAY['Lats', 'Biceps'], 'cables', 'beginner'),
('Seated Cable Row', 'Horizontal cable pulling while seated', ARRAY['Back', 'Biceps', 'Rear Delts'], 'cables', 'beginner'),
('Deadlift', 'Hip hinge movement lifting barbell from floor', ARRAY['Back', 'Glutes', 'Hamstrings', 'Core'], 'barbell', 'advanced'),
('Romanian Deadlift', 'Hip hinge with slight knee bend for hamstring focus', ARRAY['Hamstrings', 'Glutes', 'Lower Back'], 'barbell', 'intermediate'),

-- Shoulder Exercises
('Overhead Press', 'Standing barbell press above head', ARRAY['Shoulders', 'Triceps'], 'barbell', 'intermediate'),
('Dumbbell Shoulder Press', 'Seated or standing dumbbell press overhead', ARRAY['Shoulders', 'Triceps'], 'dumbbells', 'beginner'),
('Lateral Raises', 'Raising dumbbells to sides for deltoid isolation', ARRAY['Side Delts', 'Shoulders'], 'dumbbells', 'beginner'),
('Front Raises', 'Raising dumbbells in front for anterior delt focus', ARRAY['Front Delts', 'Shoulders'], 'dumbbells', 'beginner'),
('Reverse Flyes', 'Bent over dumbbell raises for rear delts', ARRAY['Rear Delts', 'Upper Back'], 'dumbbells', 'beginner'),
('Arnold Press', 'Rotating dumbbell press for full shoulder development', ARRAY['Shoulders', 'Triceps'], 'dumbbells', 'intermediate'),
('Face Pulls', 'Cable pulling toward face for rear delts and posture', ARRAY['Rear Delts', 'Rotator Cuff'], 'cables', 'beginner'),
('Pike Push-ups', 'Inverted V position push-up for shoulder focus', ARRAY['Shoulders', 'Triceps'], 'bodyweight', 'intermediate'),

-- Arm Exercises
('Bicep Curls', 'Classic dumbbell curling motion', ARRAY['Biceps'], 'dumbbells', 'beginner'),
('Hammer Curls', 'Neutral grip dumbbell curls for brachialis', ARRAY['Biceps', 'Forearms'], 'dumbbells', 'beginner'),
('Barbell Curls', 'Standing barbell curling for bicep mass', ARRAY['Biceps'], 'barbell', 'beginner'),
('Concentration Curls', 'Seated single-arm curl with elbow braced on thigh', ARRAY['Biceps'], 'dumbbells', 'beginner'),
('Tricep Dips', 'Bodyweight pressing motion for triceps', ARRAY['Triceps', 'Chest', 'Shoulders'], 'bodyweight', 'intermediate'),
('Tricep Pushdowns', 'Cable pushing motion for tricep isolation', ARRAY['Triceps'], 'cables', 'beginner'),
('Overhead Tricep Extension', 'Extending weight overhead for long head triceps', ARRAY['Triceps'], 'dumbbells', 'beginner'),
('Skull Crushers', 'Lying tricep extension with barbell or dumbbells', ARRAY['Triceps'], 'barbell', 'intermediate'),

-- Leg Exercises
('Squats', 'Fundamental lower body compound movement', ARRAY['Quadriceps', 'Glutes', 'Hamstrings'], 'bodyweight', 'beginner'),
('Goblet Squats', 'Front-loaded squat holding weight at chest', ARRAY['Quadriceps', 'Glutes', 'Core'], 'dumbbells', 'beginner'),
('Barbell Back Squats', 'Barbell across upper back for heavy squatting', ARRAY['Quadriceps', 'Glutes', 'Hamstrings'], 'barbell', 'intermediate'),
('Front Squats', 'Barbell at front of shoulders for quad focus', ARRAY['Quadriceps', 'Core', 'Glutes'], 'barbell', 'advanced'),
('Lunges', 'Alternating stepping movement for legs', ARRAY['Quadriceps', 'Glutes', 'Hamstrings'], 'bodyweight', 'beginner'),
('Walking Lunges', 'Forward walking lunge pattern', ARRAY['Quadriceps', 'Glutes', 'Hamstrings'], 'bodyweight', 'beginner'),
('Bulgarian Split Squats', 'Single-leg squat with rear foot elevated', ARRAY['Quadriceps', 'Glutes'], 'bodyweight', 'intermediate'),
('Step-ups', 'Stepping onto elevated platform', ARRAY['Quadriceps', 'Glutes'], 'bodyweight', 'beginner'),
('Leg Press', 'Machine pressing for leg development', ARRAY['Quadriceps', 'Glutes', 'Hamstrings'], 'machine', 'beginner'),
('Leg Curls', 'Machine isolation for hamstrings', ARRAY['Hamstrings'], 'machine', 'beginner'),
('Leg Extensions', 'Machine isolation for quadriceps', ARRAY['Quadriceps'], 'machine', 'beginner'),
('Calf Raises', 'Rising onto toes for calf development', ARRAY['Calves'], 'bodyweight', 'beginner'),
('Glute Bridges', 'Hip thrust from floor for glute activation', ARRAY['Glutes', 'Hamstrings'], 'bodyweight', 'beginner'),
('Hip Thrusts', 'Barbell hip thrusting with back on bench', ARRAY['Glutes', 'Hamstrings'], 'barbell', 'intermediate'),

-- Core Exercises
('Plank', 'Static hold in push-up position on forearms', ARRAY['Core', 'Abs', 'Shoulders'], 'bodyweight', 'beginner'),
('Side Plank', 'Lateral static hold for obliques', ARRAY['Obliques', 'Core'], 'bodyweight', 'beginner'),
('Crunches', 'Classic abdominal curling motion', ARRAY['Abs', 'Core'], 'bodyweight', 'beginner'),
('Bicycle Crunches', 'Alternating elbow to knee crunch motion', ARRAY['Abs', 'Obliques'], 'bodyweight', 'beginner'),
('Leg Raises', 'Raising legs while lying for lower abs', ARRAY['Lower Abs', 'Core'], 'bodyweight', 'intermediate'),
('Hanging Leg Raises', 'Raising legs while hanging from bar', ARRAY['Lower Abs', 'Core', 'Hip Flexors'], 'pull-up bar', 'advanced'),
('Russian Twists', 'Seated rotating motion for obliques', ARRAY['Obliques', 'Core'], 'bodyweight', 'beginner'),
('Mountain Climbers', 'Dynamic plank with alternating knee drives', ARRAY['Core', 'Shoulders', 'Cardio'], 'bodyweight', 'beginner'),
('Dead Bug', 'Alternating arm and leg extension while lying', ARRAY['Core', 'Abs'], 'bodyweight', 'beginner'),
('Bird Dog', 'Opposite arm and leg extension from all fours', ARRAY['Core', 'Lower Back', 'Glutes'], 'bodyweight', 'beginner'),

-- Full Body / Cardio
('Burpees', 'Full body explosive movement with jump', ARRAY['Full Body', 'Cardio'], 'bodyweight', 'intermediate'),
('Jumping Jacks', 'Classic cardio exercise with arm and leg movement', ARRAY['Full Body', 'Cardio'], 'bodyweight', 'beginner'),
('High Knees', 'Running in place with high knee lift', ARRAY['Cardio', 'Hip Flexors', 'Core'], 'bodyweight', 'beginner'),
('Box Jumps', 'Explosive jumping onto elevated platform', ARRAY['Legs', 'Glutes', 'Power'], 'box', 'intermediate'),
('Jump Squats', 'Explosive squat with vertical jump', ARRAY['Quadriceps', 'Glutes', 'Power'], 'bodyweight', 'intermediate'),
('Kettlebell Swings', 'Hip hinge with explosive kettlebell swing', ARRAY['Glutes', 'Hamstrings', 'Core', 'Cardio'], 'kettlebell', 'intermediate');