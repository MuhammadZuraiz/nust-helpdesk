-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "isResolveBreached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isResponseBreached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolveBreachAt" TIMESTAMP(3),
ADD COLUMN     "resolveDueAt" TIMESTAMP(3),
ADD COLUMN     "responseBreachAt" TIMESTAMP(3),
ADD COLUMN     "responseDueAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SlaPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "responseMinutes" INTEGER NOT NULL,
    "resolveMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlaPolicy_name_key" ON "SlaPolicy"("name");
