import { model, Schema, type Types } from 'mongoose';

export interface EmailChangeToken {
  user: Types.ObjectId;
  pendingEmail: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const emailChangeTokenSchema = new Schema<EmailChangeToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    pendingEmail: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
      match: /^[a-f0-9]{64}$/,
    },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consumedAt: { type: Date, default: null },
  },
  {
    collection: 'email_change_tokens',
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_document, returnedObject) => {
        const publicToken = returnedObject as Partial<typeof returnedObject>;
        delete publicToken.tokenHash;
        return publicToken;
      },
    },
  },
);

export const EmailChangeTokenModel = model<EmailChangeToken>(
  'EmailChangeToken',
  emailChangeTokenSchema,
);
