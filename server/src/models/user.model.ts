import { model, Schema } from 'mongoose';

export const userRoles = ['user', 'admin'] as const;

export interface User {
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl: string | null;
  avatarPublicId: string | null;
  bio: string | null;
  role: (typeof userRoles)[number];
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9][a-z0-9_]*[a-z0-9]$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
      maxlength: 255,
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 2_048,
      default: null,
    },
    avatarPublicId: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },
    role: {
      type: String,
      enum: userRoles,
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_document, returnedObject) => {
        const publicUser = returnedObject as Partial<typeof returnedObject>;
        delete publicUser.passwordHash;
        delete publicUser.avatarPublicId;

        return publicUser;
      },
    },
  },
);

export const UserModel = model<User>('User', userSchema);
