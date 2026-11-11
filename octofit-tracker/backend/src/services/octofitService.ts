import { Activity, Team, User, Workout } from '../models/index.js';
import mongoose from 'mongoose';

export async function listActivities() {
  return Activity.find().lean();
}

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) {
    throw httpError('Activity details are required', 400);
  }

  const { userId, teamId, type, minutes } = input;
  if (
    typeof userId !== 'string' ||
    !mongoose.isObjectIdOrHexString(userId) ||
    typeof teamId !== 'string' ||
    !mongoose.isObjectIdOrHexString(teamId) ||
    typeof type !== 'string' ||
    !type.trim() ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    throw httpError('Invalid activity details', 400);
  }

  const [user, team] = await Promise.all([
    User.findById(userId).select('_id').lean(),
    Team.findById(teamId).select('_id').lean(),
  ]);
  if (!user || !team) {
    throw httpError('Activity user or team was not found', 404);
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) {
    throw httpError('Team details are required', 400);
  }

  const { name, mascot } = input;
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof mascot !== 'string' ||
    !mascot.trim()
  ) {
    throw httpError('Invalid team details', 400);
  }

  const members = input.members ?? [];
  if (!Array.isArray(members)) {
    throw httpError('Team members must be an array of user IDs', 400);
  }
  const memberIds: string[] = [];
  for (const member of members) {
    if (typeof member !== 'string' || !mongoose.isObjectIdOrHexString(member)) {
      throw httpError('Invalid team member ID', 400);
    }
    memberIds.push(member);
  }
  const uniqueMemberIds = [...new Set(memberIds)];
  if (uniqueMemberIds.length > 0) {
    const existingUsers = await User.find({ _id: { $in: uniqueMemberIds } }).select('_id').lean();
    if (existingUsers.length !== uniqueMemberIds.length) {
      throw httpError('One or more team members were not found', 404);
    }
  }

  return Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: uniqueMemberIds,
  });
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);
  const teams = await Team.find({ _id: { $in: totals.map(({ _id }) => _id) } })
    .select('_id name')
    .lean();
  const teamNames = new Map(teams.map((team) => [team._id.toString(), team.name]));

  return totals.flatMap(({ _id, totalPoints }, index) => {
    const teamName = teamNames.get(_id.toString());
    return teamName === undefined ? [] : [{ teamName, totalPoints, rank: index + 1 }];
  });
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).select('fitnessGoal').lean();
  if (!user) {
    throw httpError('User was not found', 404);
  }

  const recentActivity = await Activity.findOne({ user: user._id })
    .sort({ occurredAt: -1 })
    .select('type')
    .lean();
  const activityType = recentActivity?.type.toLowerCase();
  const activityFocus = activityType
    ? new Map([
        ['run', 'endurance'],
        ['running', 'endurance'],
        ['cycle', 'endurance'],
        ['cycling', 'endurance'],
        ['walk', 'endurance'],
        ['walking', 'endurance'],
      ]).get(activityType) ?? activityType
    : undefined;

  const workouts = await Workout.find().sort({ title: 1 }).lean();
  const hasActivityMatch = activityFocus !== undefined &&
    workouts.some((workout) => workout.focus.toLowerCase() === activityFocus);
  const preferredFocus = hasActivityMatch ? activityFocus : user.fitnessGoal.toLowerCase();
  workouts.sort((left, right) => {
    const leftMatches = left.focus.toLowerCase() === preferredFocus;
    const rightMatches = right.focus.toLowerCase() === preferredFocus;
    return Number(rightMatches) - Number(leftMatches);
  });

  return workouts.map((workout, index) => ({
    ...workout,
    reason: index === 0 && hasActivityMatch
      ? `Recommended based on your recent ${recentActivity?.type} activity.`
      : `Recommended to support your ${user.fitnessGoal} fitness goal.`,
  }));
}

export { User };
