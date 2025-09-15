-- CreateTable
CREATE TABLE "FacebookPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facebookAccountId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FacebookPage_facebookAccountId_fkey" FOREIGN KEY ("facebookAccountId") REFERENCES "FacebookAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InstagramAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facebookPageId" TEXT NOT NULL,
    "instagramId" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT NOT NULL,
    "profilePictureUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstagramAccount_facebookPageId_fkey" FOREIGN KEY ("facebookPageId") REFERENCES "FacebookPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FacebookPage_facebookAccountId_pageId_key" ON "FacebookPage"("facebookAccountId", "pageId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAccount_facebookPageId_instagramId_key" ON "InstagramAccount"("facebookPageId", "instagramId");
