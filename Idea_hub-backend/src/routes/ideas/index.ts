import { Router } from 'express';

import { registerCollabRoutes } from './register-collab-routes.js';
import { registerCommentRoutes } from './register-comments.js';
import { registerCreateRoute } from './register-create.js';
import { registerEngagementRoutes } from './register-engagement-routes.js';
import { registerFeedRoutes } from './register-feed.js';
import { registerGetOneRoute } from './register-get-one.js';
import { registerLikeRoutes } from './register-likes.js';
import { registerMediaRoutes } from './register-media-routes.js';
import { registerPatchRoute } from './register-patch.js';
import { registerPollRoutes } from './register-poll-routes.js';
import { registerValidationRecalcRoute } from './register-validation-recalc.js';
import { registerVersionRoutes } from './register-version-routes.js';

export const ideasRouter = Router();

registerFeedRoutes(ideasRouter);
registerCollabRoutes(ideasRouter);
registerCommentRoutes(ideasRouter);
registerLikeRoutes(ideasRouter);
registerEngagementRoutes(ideasRouter);
registerMediaRoutes(ideasRouter);
registerValidationRecalcRoute(ideasRouter);
registerPatchRoute(ideasRouter);
registerVersionRoutes(ideasRouter);
registerPollRoutes(ideasRouter);
registerGetOneRoute(ideasRouter);
registerCreateRoute(ideasRouter);
