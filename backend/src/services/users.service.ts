import { Types } from 'mongoose';
import { User, LiveState, RefreshToken } from '../models';
import { AppError } from '../utils/AppError';
import { hashPassword } from '../utils/password';
import { Role } from '../utils/jwt';

/** All users (any role), newest first, without password hashes. */
export async function listUsers() {
  return User.find()
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .lean()
    .then((rows) => rows.map((u) => ({ ...u, _id: String(u._id) })));
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
}) {
  const email = input.email.toLowerCase();
  const existing = await User.findOne({ email }).lean();
  if (existing) throw AppError.conflict('A user with that email already exists');

  const user = await User.create({
    name: input.name,
    email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    phone: input.phone,
  });

  // Give salespeople a live-state row so they show up on the dashboard immediately.
  if (input.role === 'salesperson') {
    await LiveState.create({ userId: user._id, trackingStatus: 'INACTIVE' });
  }

  const obj = user.toObject();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = obj;
  return { ...safe, _id: String(user._id) };
}

export async function updateUser(
  id: string,
  patch: Partial<{ name: string; phone: string; role: Role; isActive: boolean }>
) {
  const user = await User.findByIdAndUpdate(id, patch, { new: true })
    .select('-passwordHash')
    .lean();
  if (!user) throw AppError.notFound('User not found');

  // Deactivating a user should also revoke their refresh tokens (force sign-out).
  if (patch.isActive === false) {
    await RefreshToken.updateMany({ userId: new Types.ObjectId(id) }, { $set: { revoked: true } });
    await LiveState.updateOne(
      { userId: new Types.ObjectId(id) },
      { $set: { trackingStatus: 'INACTIVE', isOnline: false } }
    );
  }
  return { ...user, _id: String(user._id) };
}

export async function resetPassword(id: string, newPassword: string) {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound('User not found');
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  // Invalidate existing sessions so the old password can't be reused via refresh.
  await RefreshToken.updateMany({ userId: new Types.ObjectId(id) }, { $set: { revoked: true } });
  return { ok: true };
}
