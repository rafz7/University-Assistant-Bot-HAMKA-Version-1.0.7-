CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "languageCode" TEXT NOT NULL DEFAULT 'id',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_telegramId_key" ON "users"("telegramId");

CREATE TABLE IF NOT EXISTS "academic_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nim" TEXT, "faculty" TEXT, "program" TEXT,
    "semester" INTEGER NOT NULL DEFAULT 1,
    "targetGpa" REAL, "currentGpa" REAL, "angkatan" INTEGER, "advisorName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "academic_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "academic_profiles_userId_key" ON "academic_profiles"("userId");

CREATE TABLE IF NOT EXISTS "tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT, "subject" TEXT,
    "type" TEXT NOT NULL DEFAULT 'ASSIGNMENT',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" DATETIME, "reminderAt" DATETIME, "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "startTime" TEXT NOT NULL, "endTime" TEXT NOT NULL,
    "room" TEXT, "lecturer" TEXT,
    "type" TEXT NOT NULL DEFAULT 'LECTURE',
    "semester" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "transcripts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL, "code" TEXT,
    "credits" INTEGER NOT NULL,
    "grade" TEXT NOT NULL, "gradePoint" REAL NOT NULL,
    "semester" INTEGER NOT NULL, "year" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "transcripts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL, "content" TEXT NOT NULL,
    "category" TEXT, "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "habit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL, "date" DATETIME NOT NULL,
    "shalat" BOOLEAN NOT NULL DEFAULT false,
    "tilawah" BOOLEAN NOT NULL DEFAULT false,
    "dzikir" BOOLEAN NOT NULL DEFAULT false,
    "tahajud" BOOLEAN NOT NULL DEFAULT false,
    "puasa" BOOLEAN NOT NULL DEFAULT false,
    "belajar" BOOLEAN NOT NULL DEFAULT false,
    "olahraga" BOOLEAN NOT NULL DEFAULT false,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "habit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "habit_logs_userId_date_key" ON "habit_logs"("userId","date");

CREATE TABLE IF NOT EXISTS "quran_bookmarks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "surahNumber" INTEGER NOT NULL, "ayahNumber" INTEGER NOT NULL, "surahName" TEXT NOT NULL,
    "note" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quran_bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL, "agent" TEXT NOT NULL DEFAULT 'general',
    "messages" TEXT NOT NULL DEFAULT '[]',
    "summary" TEXT, "tokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "user_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'id',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "prayerReminder" BOOLEAN NOT NULL DEFAULT true,
    "taskReminder" BOOLEAN NOT NULL DEFAULT true,
    "dailyQuote" BOOLEAN NOT NULL DEFAULT true,
    "notificationTime" TEXT NOT NULL DEFAULT '07:00',
    "city" TEXT NOT NULL DEFAULT 'Jakarta',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_settings_userId_key" ON "user_settings"("userId");

CREATE TABLE IF NOT EXISTS "career_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "targetJob" TEXT, "skills" TEXT NOT NULL DEFAULT '[]',
    "experiences" TEXT, "education" TEXT, "cvData" TEXT, "portfolioLinks" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "career_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "career_profiles_userId_key" ON "career_profiles"("userId");

CREATE TABLE IF NOT EXISTS "achievements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL, "title" TEXT NOT NULL,
    "description" TEXT, "badge" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "knowledge_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL, "content" TEXT NOT NULL,
    "source" TEXT NOT NULL, "category" TEXT NOT NULL,
    "url" TEXT, "vectorId" TEXT, "metadata" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_documents_vectorId_key" ON "knowledge_documents"("vectorId");

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT, "action" TEXT NOT NULL,
    "resource" TEXT, "details" TEXT, "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "system_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL, "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "system_configs_key_key" ON "system_configs"("key");
