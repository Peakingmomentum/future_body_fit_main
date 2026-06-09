

# Cross-Reference Missing Exercise Demos with Existing Database

## Findings

25 exercises are missing demos. After searching, nearly all have equivalent exercises already in the database with cached GIFs. Here's the mapping:

| Missing Exercise | Matching Cached Exercise | Status |
|---|---|---|
| Barbell Back Squats | `barbell full squat` | Has cached GIF |
| Bird Dog | No exact match | Needs ExerciseDB lookup |
| Box Jumps | `box jump down with one leg stabilization` | Has cached GIF |
| Burpees | `burpee` | Has cached GIF |
| Cable Crossover | No exact match | Needs ExerciseDB lookup |
| Chin-ups | `chin-up` | Still has proxy URL - needs re-cache |
| Crunches | No exact "crunch" match | Needs ExerciseDB lookup |
| Dumbbell Incline Chest Press | `dumbbell incline bench press` | Still has proxy URL |
| Dumbbell Overhead Press | `Dumbbell Shoulder Press` | Has cached GIF |
| Dumbbell Rows | `dumbbell bent over row` | Has cached GIF |
| Face Pulls | No exact match | Needs ExerciseDB lookup |
| Handstand Push-Ups | `handstand push-up` | Still has proxy URL |
| Jumping Jacks | No exact match | Needs ExerciseDB lookup |
| L-Sit Holds | `l-sit on floor` | Has cached GIF |
| Leg Extensions | `lever leg extension` | Still has proxy URL |
| Lunges | `forward lunge (male)` | Still has proxy URL |
| Mountain Climbers | `mountain climber` | Still has proxy URL |
| Seated Cable Row | `cable seated row` | Still has proxy URL |
| Single-Arm Kettlebell/Dumbbell RDL | `dumbbell single leg deadlift` | Has proxy URL |
| Single-Leg Elevated Hip Thrust | `Hip Thrusts` | Has cached GIF (close match) |
| Skull Crushers | `barbell lying triceps extension skull crusher` | Has cached GIF |
| Squats | `barbell full squat` or `band squat` | Has cached GIF |
| Step-ups | `dumbbell step-up` / `barbell step-up` | Has cached GIF |
| Superman To Hollow Body Roll | No exact match | Needs ExerciseDB lookup |
| Tricep Pushdowns | `cable pushdown` | Has cached GIF |

## Plan

### 1. Create an edge function `link-missing-exercises`
A one-shot function that copies the `external_video_url` from the matching exercise to the missing one. For the ~18 exercises with clear matches, this is a direct DB update — no API calls needed.

### 2. Handle the ~7 exercises with no match
For Bird Dog, Cable Crossover, Crunches, Face Pulls, Jumping Jacks, Superman To Hollow Body Roll — use a fuzzy search against ExerciseDB API to find the closest match and cache the GIF.

### 3. Fix proxy URLs
Several matched exercises still use the old proxy URL format (`/functions/v1/exercise-image?id=...`). The cache function should also pick these up on the next run once quota allows.

### Implementation
- **`supabase/functions/link-missing-exercises/index.ts`** — New edge function that:
  1. Has a hardcoded mapping of missing exercise IDs to matched exercise names
  2. Looks up the matched exercise's cached GIF URL
  3. Updates the missing exercise's `external_video_url` to point to the same GIF
  4. For unmatched exercises, queries ExerciseDB API by name and caches the result
- **`src/components/AdminExerciseManager.tsx`** — Add a "Link Missing Demos" button that invokes this function

### Files to create/edit
- `supabase/functions/link-missing-exercises/index.ts` (new)
- `src/components/AdminExerciseManager.tsx` (add button)

