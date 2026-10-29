import mongoose, { Schema, Document, Types } from 'mongoose';

export enum UserRole {
    USER = 'USER',
    ADMIN = 'ADMIN',
}

export enum UserStatus {
    ACTIVE = 'ACTIVE',
    LOCKED = 'LOCKED',
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  fullName: string;
  passwordHash: string;
  pinHash?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    fullName: { 
        type: String, 
        required: true, 
        trim: true 
    },
    passwordHash: { 
        type: String, 
        required: true, 
        select: false 
    },
    pinHash: { 
        type: String, 
        select: false 
    },
    role: { 
        type: String, 
        enum: Object.values(UserRole), 
        default: UserRole.USER 
    },
    status: { 
        type: String, 
        enum: Object.values(UserStatus), 
        default: UserStatus.ACTIVE 
    },
    },
    { 
        timestamps: true 
    }
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);