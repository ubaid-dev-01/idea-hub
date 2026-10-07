import mongoose, { type Types } from 'mongoose';

import { Idea } from '../models/index.js';
import { IdeaVersion } from '../models/IdeaVersion.model.js';

export async function createInitialIdeaVersion(input: {
  ideaId: Types.ObjectId;
  title: string;
  description: string;
  category: string;
  tags: string[];
  editedBy: Types.ObjectId;
}): Promise<void> {
  const exists = await IdeaVersion.exists({ ideaId: input.ideaId });
  if (exists) return;
  await IdeaVersion.create({
    ideaId: input.ideaId,
    versionNumber: 1,
    title: input.title,
    description: input.description,
    category: input.category,
    tags: input.tags,
    editedBy: input.editedBy,
  });
}

/**
 * If a published idea has no rows in `IdeaVersion` (legacy / missed snapshot),
 * create one from the live document so Changelog & diff work.
 */
export async function ensurePublishedIdeaHasVersionHistory(
  ideaIdStr: string
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(ideaIdStr)) return;
  const oid = new mongoose.Types.ObjectId(ideaIdStr);
  const existing = await IdeaVersion.exists({ ideaId: oid });
  if (existing) return;

  const idea = await Idea.findById(oid)
    .select('status title description category tags authorId version')
    .lean();
  if (!idea || idea.status !== 'published') return;

  const vn =
    typeof idea.version === 'number' && idea.version >= 1 ? idea.version : 1;

  await IdeaVersion.create({
    ideaId: oid,
    versionNumber: vn,
    title: idea.title,
    description: idea.description,
    category: String(idea.category),
    tags: Array.isArray(idea.tags) ? idea.tags : [],
    editedBy: idea.authorId as Types.ObjectId,
  });
}

export async function appendIdeaVersionSnapshot(input: {
  ideaId: Types.ObjectId;
  nextVersionNumber: number;
  title: string;
  description: string;
  category: string;
  tags: string[];
  editedBy: Types.ObjectId;
}): Promise<void> {
  await IdeaVersion.create({
    ideaId: input.ideaId,
    versionNumber: input.nextVersionNumber,
    title: input.title,
    description: input.description,
    category: input.category,
    tags: input.tags,
    editedBy: input.editedBy,
  });
}

export type VersionDiffField =
  | 'title'
  | 'description'
  | 'category'
  | 'tags';

export type IdeaVersionDiff = {
  fromVersion: number;
  toVersion: number;
  changes: Array<{
    field: VersionDiffField;
    before: unknown;
    after: unknown;
  }>;
};

export function diffIdeaVersions(a: IIdeaVersionLean, b: IIdeaVersionLean): IdeaVersionDiff {
  const changes: IdeaVersionDiff['changes'] = [];
  if (a.title !== b.title) {
    changes.push({ field: 'title', before: a.title, after: b.title });
  }
  if (a.description !== b.description) {
    changes.push({
      field: 'description',
      before: a.description,
      after: b.description,
    });
  }
  if (a.category !== b.category) {
    changes.push({
      field: 'category',
      before: a.category,
      after: b.category,
    });
  }
  const ta = [...(a.tags ?? [])].map((t) => String(t).toLowerCase()).sort();
  const tb = [...(b.tags ?? [])].map((t) => String(t).toLowerCase()).sort();
  if (ta.join(',') !== tb.join(',')) {
    changes.push({ field: 'tags', before: ta, after: tb });
  }
  return {
    fromVersion: a.versionNumber,
    toVersion: b.versionNumber,
    changes,
  };
}

export type IIdeaVersionLean = {
  versionNumber: number;
  title: string;
  description: string;
  category: string;
  tags: string[];
};

export async function loadIdeaVersionLean(
  ideaId: string,
  versionNumber: number
): Promise<IIdeaVersionLean | null> {
  if (!mongoose.Types.ObjectId.isValid(ideaId)) return null;
  const row = await IdeaVersion.findOne({
    ideaId: new mongoose.Types.ObjectId(ideaId),
    versionNumber,
  })
    .select('versionNumber title description category tags')
    .lean<IIdeaVersionLean | null>();
  return row;
}
