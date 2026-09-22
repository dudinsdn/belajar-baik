export type UserRole = "student" | "teacher" | "admin";

export type CurrentUser = {
  id: string;
  externalIdentityId: string;
  email: string;
  displayName: string;
  role: UserRole;
  source: "platform" | "development";
};

export type StoredUser = Omit<CurrentUser, "source"> & {
  status: "active" | "inactive";
};

export type AuthEnvironment = {
  RUNTIME_ENV?: string;
  RT_DEV_AUTH?: string;
  RT_DEV_USER_ID?: string;
  RT_DEV_EXTERNAL_ID?: string;
  RT_DEV_USER_EMAIL?: string;
  RT_DEV_USER_NAME?: string;
  RT_DEV_USER_ROLE?: string;
};

export type UserLookup = (
  externalIdentityId: string,
) => Promise<StoredUser | null>;
export type UserLookupByEmail = (email: string) => Promise<StoredUser | null>;
