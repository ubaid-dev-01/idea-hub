import type { Router } from 'express';

import { requireAuth } from '../../middleware/require-auth.js';
import { postCreateIdea } from './post-create-idea.js';
import { requireDb } from './guards.js';

export function registerCreateRoute(ideasRouter: Router): void {
  ideasRouter.post('/', requireDb, requireAuth, (req, res) => {
    void postCreateIdea(req, res);
  });
}
