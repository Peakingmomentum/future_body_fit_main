import workoutsData from '@/data/workouts.json';
import { GeneratedWorkout, GeneratedExercise } from '@/hooks/useWorkoutLogs';

interface CuratedExercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  note?: string;
}

interface CuratedSection {
  name: string;
  tag: string;
  exercises: CuratedExercise[];
}

interface CuratedWorkout {
  id: string;
  title: string;
  type: string;
  equipment: string;
  level: string;
  goal: string;
  duration: number;
  intensity: string;
  coachNote: string;
  sections: CuratedSection[];
  closingNote: string;
}

const EQUIPMENT_MAP: Record<string, string[]> = {
  no_equipment: ['Bodyweight Only', 'Field / Track'],
  minimal: ['Bodyweight Only', 'Dumbbells Only', 'Kettlebells', 'Resistance Bands'],
  home_gym: ['Bodyweight Only', 'Dumbbells Only', 'Kettlebells', 'Resistance Bands', 'Home Gym', 'Full Gym'],
  full_gym: ['Bodyweight Only', 'Dumbbells Only', 'Kettlebells', 'Resistance Bands', 'Home Gym', 'Full Gym', 'Field / Track'],
};

const FOCUS_MAP: Record<string, string[]> = {
  full_body: ['Full Body', 'QB-Specific Athletic Training'],
  upper_body: ['Upper Body'],
  lower_body: ['Lower Body'],
  core: ['Core & Abs'],
  cardio: ['Conditioning & Cardio'],
  speed_agility: ['Speed & Agility'],
  conditioning: ['Conditioning & Cardio'],
  mobility: ['Mobility'],
};

const RECENT_KEY = 'fbf_recent_workouts';
const MAX_RECENT = 5;

function getRecentIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecentId(id: string) {
  const recent = getRecentIds().filter(r => r !== id);
  recent.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function transformToGeneratedWorkout(curated: CuratedWorkout): GeneratedWorkout & { source: 'curated'; coachNote: string; closingNote: string } {
  const exercises: GeneratedExercise[] = [];

  for (const section of curated.sections) {
    // Add section header as a pseudo-exercise
    exercises.push({
      name: `— ${section.name} —`,
      sets: 0,
      reps: section.tag,
      rest: '',
      description: '',
      tips: [],
    });

    for (const ex of section.exercises) {
      exercises.push({
        name: ex.name,
        sets: parseInt(ex.sets) || 1,
        reps: ex.reps,
        rest: ex.rest,
        description: ex.note || '',
        tips: ex.note ? [ex.note] : [],
      });
    }
  }

  return {
    name: curated.title,
    duration: `${curated.duration} min`,
    calories: '',
    exercises,
    source: 'curated',
    coachNote: curated.coachNote,
    closingNote: curated.closingNote,
  };
}

export function findCuratedWorkout(
  focusArea: string,
  equipment: string
): (GeneratedWorkout & { source: 'curated'; coachNote: string; closingNote: string }) | null {
  const workouts = (workoutsData as { workouts: CuratedWorkout[] }).workouts;
  const allowedEquipment = EQUIPMENT_MAP[equipment] || [];
  const allowedTypes = FOCUS_MAP[focusArea] || [];

  // Filter by focus area and equipment compatibility
  const matches = workouts.filter(
    w => allowedTypes.includes(w.type) && allowedEquipment.includes(w.equipment)
  );

  if (matches.length === 0) return null;

  // Prefer workouts not recently used
  const recentIds = getRecentIds();
  const fresh = matches.filter(w => !recentIds.includes(w.id));
  const pool = fresh.length > 0 ? fresh : matches;

  // Random pick from pool
  const pick = pool[Math.floor(Math.random() * pool.length)];
  addRecentId(pick.id);

  return transformToGeneratedWorkout(pick);
}
