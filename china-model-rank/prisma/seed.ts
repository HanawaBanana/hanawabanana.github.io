import { PrismaClient } from "@prisma/client";
import { defaultWeights } from "@/lib/scoring";
import { getRankedModels, rankedModelsData, reviews, vendors } from "@/lib/data";

const prisma = new PrismaClient();

async function main() {
  for (const vendor of vendors) {
    await prisma.vendor.upsert({
      where: { id: vendor.id },
      update: vendor,
      create: vendor
    });
  }

  for (const model of rankedModelsData) {
    await prisma.model.upsert({
      where: { id: model.id },
      update: {
        slug: model.slug,
        name: model.name,
        vendorId: model.vendorId,
        family: model.family,
        aliases: model.aliases,
        tags: model.tags,
        releaseType: model.releaseType,
        access: model.access,
        freeAccess: model.freeAccess,
        paidCost: model.paidCost,
        summary: model.summary
      },
      create: {
        id: model.id,
        slug: model.slug,
        name: model.name,
        vendorId: model.vendorId,
        family: model.family,
        aliases: model.aliases,
        tags: model.tags,
        releaseType: model.releaseType,
        access: model.access,
        freeAccess: model.freeAccess,
        paidCost: model.paidCost,
        summary: model.summary
      }
    });
  }

  await prisma.scoreRule.create({
    data: {
      name: "v1 default",
      capability: defaultWeights.capability,
      priceAccess: defaultWeights.priceAccess,
      coding: defaultWeights.coding,
      dataAnalysis: defaultWeights.dataAnalysis,
      ecosystem: defaultWeights.ecosystem,
      userReputation: defaultWeights.userReputation,
      active: true
    }
  });

  for (const review of reviews) {
    await prisma.normalizedReview.upsert({
      where: { id: review.id },
      update: {
        modelId: review.modelId,
        platform: review.platform,
        authorLabel: review.authorLabel,
        title: review.title,
        excerpt: review.excerpt,
        quote: review.quote,
        quoteType: review.quoteType,
        sourceTitle: review.sourceTitle,
        url: review.url,
        sourceUrl: review.sourceUrl,
        publishedAt: new Date(review.publishedAt),
        collectedAt: new Date(review.collectedAt),
        isExample: review.isExample,
        sentiment: review.sentiment,
        confidence: review.confidence,
        topics: review.topics,
        engagement: review.engagement,
        engagementMetrics: review.engagementMetrics,
        positiveSignals: review.positiveSignals,
        auditStatus: review.auditStatus
      },
      create: {
        id: review.id,
        modelId: review.modelId,
        platform: review.platform,
        authorLabel: review.authorLabel,
        title: review.title,
        excerpt: review.excerpt,
        quote: review.quote,
        quoteType: review.quoteType,
        sourceTitle: review.sourceTitle,
        url: review.url,
        sourceUrl: review.sourceUrl,
        publishedAt: new Date(review.publishedAt),
        collectedAt: new Date(review.collectedAt),
        isExample: review.isExample,
        sentiment: review.sentiment,
        confidence: review.confidence,
        topics: review.topics,
        engagement: review.engagement,
        engagementMetrics: review.engagementMetrics,
        positiveSignals: review.positiveSignals,
        auditStatus: review.auditStatus
      }
    });
  }

  for (const ranked of getRankedModels()) {
    await prisma.scoreSnapshot.create({
      data: {
        modelId: ranked.id,
        total: ranked.score.total,
        rank: ranked.score.rank,
        previousRank: ranked.score.previousRank,
        capability: ranked.score.breakdown.capability,
        priceAccess: ranked.score.breakdown.priceAccess,
        coding: ranked.score.breakdown.coding,
        dataAnalysis: ranked.score.breakdown.dataAnalysis,
        ecosystem: ranked.score.breakdown.ecosystem,
        userReputation: ranked.score.breakdown.userReputation,
        explanation: ranked.score.explanation,
        sourceCount: ranked.score.sourceCount,
        reviewCount: ranked.score.reviewCount,
        generatedAt: new Date(ranked.score.generatedAt)
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
