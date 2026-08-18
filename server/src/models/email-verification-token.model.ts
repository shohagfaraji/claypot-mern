import { model, Schema, type Types } from 'mongoose';

export interface EmailVerificationToken {
  user: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const emailVerificationTokenSchema = new Schema<EmailVerificationToken>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
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
    consumedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'email_verification_tokens',
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

export const EmailVerificationTokenModel = model<EmailVerificationToken>(
  'EmailVerificationToken',
  emailVerificationTokenSchema,
);
