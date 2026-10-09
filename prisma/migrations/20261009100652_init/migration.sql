-- CreateTable
CREATE TABLE "metingen" (
    "id" TEXT NOT NULL,
    "jaar" INTEGER NOT NULL,
    "aangemaakt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isOefening" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "metingen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_scores" (
    "id" TEXT NOT NULL,
    "metingId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'concept',
    "algemeneToelichting" TEXT NOT NULL DEFAULT '',
    "laatstGewijzigdDoor" TEXT NOT NULL,
    "laatstGewijzigdOp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vraag_scores" (
    "id" TEXT NOT NULL,
    "platformScoreId" TEXT NOT NULL,
    "vraagId" TEXT NOT NULL,
    "score" INTEGER,
    "toelichting" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "vraag_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_invullers" (
    "id" TEXT NOT NULL,
    "metingId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "gebruiker" TEXT NOT NULL,

    CONSTRAINT "platform_invullers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "actie" TEXT NOT NULL,
    "doelType" TEXT NOT NULL,
    "doelId" TEXT NOT NULL,
    "tijdstip" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detail" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "metingen_jaar_key" ON "metingen"("jaar");

-- CreateIndex
CREATE UNIQUE INDEX "platform_scores_metingId_platformId_key" ON "platform_scores"("metingId", "platformId");

-- CreateIndex
CREATE UNIQUE INDEX "vraag_scores_platformScoreId_vraagId_key" ON "vraag_scores"("platformScoreId", "vraagId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_invullers_metingId_platformId_gebruiker_key" ON "platform_invullers"("metingId", "platformId", "gebruiker");

-- AddForeignKey
ALTER TABLE "platform_scores" ADD CONSTRAINT "platform_scores_metingId_fkey" FOREIGN KEY ("metingId") REFERENCES "metingen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vraag_scores" ADD CONSTRAINT "vraag_scores_platformScoreId_fkey" FOREIGN KEY ("platformScoreId") REFERENCES "platform_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
