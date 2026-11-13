-- CreateTable
CREATE TABLE "gebruikers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uitgenodigd',
    "keycloakSub" TEXT,
    "aangemaakt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "laatsteLogin" TIMESTAMP(3),

    CONSTRAINT "gebruikers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gebruikers_email_key" ON "gebruikers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "gebruikers_keycloakSub_key" ON "gebruikers"("keycloakSub");
