import { model, Schema, type Types } from 'mongoose';

export interface RefreshSession {
  user: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const refreshSessionSchema = new Schema<RefreshSession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
      match: /^[a-f0-9]{64}$/,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: {
        expires: 0,
      },
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 45,
      default: null,
    },
  },
  {
    collection: 'refresh_sessions',
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_document, returnedObject) => {
        const publicSession = returnedObject as Partial<typeof returnedObject>;
        delete publicSession.tokenHash;

        return publicSession;
      },
    },
  },
);

refreshSessionSchema.index({ user: 1, revokedAt: 1 });

export const RefreshSessionModel = model<RefreshSession>('RefreshSession', refreshSessionSchema);
