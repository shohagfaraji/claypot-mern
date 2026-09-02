import { model, Schema, type Types } from 'mongoose';

export interface Follow {
  follower: Types.ObjectId;
  following: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const followSchema = new Schema<Follow>(
  {
    follower: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    following: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    collection: 'follows',
    timestamps: true,
    versionKey: false,
  },
);

followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, createdAt: -1 });
followSchema.index({ follower: 1, createdAt: -1 });

export const FollowModel = model<Follow>('Follow', followSchema);
