/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('TEXT', 'UPLOAD_IMAGE', 'UPLOAD_VIDEO', 'RUN_LLM', 'CROP_IMAGE', 'EXTRACT_FRAME');

-- CreateEnum
CREATE TYPE "RunScope" AS ENUM ('FULL', 'PARTIAL', 'SINGLE');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NodeExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled Workflow',
    "description" TEXT,
    "reactFlowSnapshot" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_node" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "rfNodeId" TEXT NOT NULL,
    "type" "NodeType" NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "config" JSONB NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_edge" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "rfEdgeId" TEXT NOT NULL,
    "sourceRfNodeId" TEXT NOT NULL,
    "sourceHandle" TEXT NOT NULL,
    "targetRfNodeId" TEXT NOT NULL,
    "targetHandle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_edge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_run" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "RunScope" NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "selectedNodeIds" JSONB,
    "triggerRunId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "workflowSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_execution" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "workflowNodeId" TEXT,
    "rfNodeId" TEXT NOT NULL,
    "nodeType" "NodeType" NOT NULL,
    "status" "NodeExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "triggerTaskId" TEXT,
    "inputs" JSONB,
    "outputs" JSONB,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "node_execution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "workflow_userId_idx" ON "workflow"("userId");

-- CreateIndex
CREATE INDEX "workflow_node_workflowId_idx" ON "workflow_node"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_node_workflowId_rfNodeId_key" ON "workflow_node"("workflowId", "rfNodeId");

-- CreateIndex
CREATE INDEX "workflow_edge_workflowId_idx" ON "workflow_edge"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_edge_workflowId_rfEdgeId_key" ON "workflow_edge"("workflowId", "rfEdgeId");

-- CreateIndex
CREATE INDEX "workflow_run_workflowId_idx" ON "workflow_run"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_run_userId_idx" ON "workflow_run"("userId");

-- CreateIndex
CREATE INDEX "node_execution_workflowRunId_idx" ON "node_execution"("workflowRunId");

-- CreateIndex
CREATE INDEX "node_execution_workflowNodeId_idx" ON "node_execution"("workflowNodeId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow" ADD CONSTRAINT "workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_node" ADD CONSTRAINT "workflow_node_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_edge" ADD CONSTRAINT "workflow_edge_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_execution" ADD CONSTRAINT "node_execution_workflowNodeId_fkey" FOREIGN KEY ("workflowNodeId") REFERENCES "workflow_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_execution" ADD CONSTRAINT "node_execution_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "workflow_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
