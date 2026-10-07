import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
/** Per-icon ESM imports — avoids Turbopack + `lucide-react` barrel bugs (stale user-plus.js chunk / “module factory is not available”). */
import ArrowUpDown from 'lucide-react/dist/esm/icons/arrow-up-down.js';
import AtSign from 'lucide-react/dist/esm/icons/at-sign.js';
import Ban from 'lucide-react/dist/esm/icons/ban.js';
import Bell from 'lucide-react/dist/esm/icons/bell.js';
import BellRing from 'lucide-react/dist/esm/icons/bell-ring.js';
import Bookmark from 'lucide-react/dist/esm/icons/bookmark.js';
import Check from 'lucide-react/dist/esm/icons/check.js';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2.js';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left.js';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.js';
import CircleUser from 'lucide-react/dist/esm/icons/circle-user.js';
import Clock from 'lucide-react/dist/esm/icons/clock.js';
import Compass from 'lucide-react/dist/esm/icons/compass.js';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card.js';
import Download from 'lucide-react/dist/esm/icons/download.js';
import Eye from 'lucide-react/dist/esm/icons/eye.js';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off.js';
import FileText from 'lucide-react/dist/esm/icons/file-text.js';
import FileType2 from 'lucide-react/dist/esm/icons/file-type-2.js';
import Flag from 'lucide-react/dist/esm/icons/flag.js';
import Flame from 'lucide-react/dist/esm/icons/flame.js';
import Handshake from 'lucide-react/dist/esm/icons/handshake.js';
import Heart from 'lucide-react/dist/esm/icons/heart.js';
import Home from 'lucide-react/dist/esm/icons/home.js';
import ImageIcon from 'lucide-react/dist/esm/icons/image.js';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb.js';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard.js';
import Link2 from 'lucide-react/dist/esm/icons/link-2.js';
import Lock from 'lucide-react/dist/esm/icons/lock.js';
import LockOpen from 'lucide-react/dist/esm/icons/lock-open.js';
import Mail from 'lucide-react/dist/esm/icons/mail.js';
import MapPin from 'lucide-react/dist/esm/icons/map-pin.js';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle.js';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square.js';
import Mic2 from 'lucide-react/dist/esm/icons/mic-2.js';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal.js';
import Pencil from 'lucide-react/dist/esm/icons/pencil.js';
import PlusCircle from 'lucide-react/dist/esm/icons/plus-circle.js';
import ScanLine from 'lucide-react/dist/esm/icons/scan-line.js';
import Search from 'lucide-react/dist/esm/icons/search.js';
import Settings2 from 'lucide-react/dist/esm/icons/settings-2.js';
import Share2 from 'lucide-react/dist/esm/icons/share-2.js';
import Sheet from 'lucide-react/dist/esm/icons/sheet.js';
import ShoppingBag from 'lucide-react/dist/esm/icons/shopping-bag.js';
import SlidersHorizontal from 'lucide-react/dist/esm/icons/sliders-horizontal.js';
import Smile from 'lucide-react/dist/esm/icons/smile.js';
import Star from 'lucide-react/dist/esm/icons/star.js';
import Tag from 'lucide-react/dist/esm/icons/tag.js';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.js';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up.js';
import Trophy from 'lucide-react/dist/esm/icons/trophy.js';
import Upload from 'lucide-react/dist/esm/icons/upload.js';
import UserCheck from 'lucide-react/dist/esm/icons/user-check.js';
import UserMinus from 'lucide-react/dist/esm/icons/user-minus.js';
import UserRound from 'lucide-react/dist/esm/icons/user-round.js';
import Users from 'lucide-react/dist/esm/icons/users.js';
import Users2 from 'lucide-react/dist/esm/icons/users-2.js';
import Video from 'lucide-react/dist/esm/icons/video.js';
import X from 'lucide-react/dist/esm/icons/x.js';
import XCircle from 'lucide-react/dist/esm/icons/x-circle.js';

const stroke = 1.5;
const defaultSize = 20;

function wrap(Icon: LucideIcon): LucideIcon {
  const Wrapped = ({
    size = defaultSize,
    strokeWidth = stroke,
    ...rest
  }: ComponentProps<typeof Icon>) => (
    <Icon size={size} strokeWidth={strokeWidth} {...rest} />
  );
  Wrapped.displayName = `Wrapped(${Icon.displayName ?? Icon.name})`;
  return Wrapped as LucideIcon;
}

export const ICONS = {
  home: wrap(Home),
  dashboard: wrap(LayoutDashboard),
  explore: wrap(Compass),
  post: wrap(PlusCircle),
  notifications: wrap(Bell),
  notificationsActive: wrap(BellRing),
  profile: wrap(CircleUser),
  settings: wrap(Settings2),
  messages: wrap(MessageSquare),
  saved: wrap(Bookmark),
  collaborations: wrap(Users2),
  trending: wrap(TrendingUp),
  myIdeas: wrap(Lightbulb),
  leaderboard: wrap(Trophy),
  marketplace: wrap(ShoppingBag),
  pricing: wrap(CreditCard),

  like: wrap(Heart),
  comment: wrap(MessageCircle),
  share: wrap(Share2),
  bookmark: wrap(Bookmark),
  collaborate: wrap(Handshake),
  more: wrap(MoreHorizontal),
  edit: wrap(Pencil),
  delete: wrap(Trash2),

  image: wrap(ImageIcon),
  video: wrap(Video),
  pdf: wrap(FileText),
  document: wrap(FileType2),
  spreadsheet: wrap(Sheet),
  audio: wrap(Mic2),
  link: wrap(Link2),

  check: wrap(Check),
  published: wrap(CheckCircle2),
  pending: wrap(Clock),
  rejected: wrap(XCircle),
  scanning: wrap(ScanLine),
  trendingFlame: wrap(Flame),
  featured: wrap(Star),
  collaborating: wrap(Users),

  follow: wrap(UserRound),
  following: wrap(UserCheck),
  unfollow: wrap(UserMinus),
  messageUser: wrap(Mail),
  block: wrap(Ban),
  report: wrap(Flag),

  email: wrap(Mail),
  password: wrap(Lock),
  passwordOpen: wrap(LockOpen),
  eye: wrap(Eye),
  eyeOff: wrap(EyeOff),
  username: wrap(AtSign),
  search: wrap(Search),
  filter: wrap(SlidersHorizontal),
  sort: wrap(ArrowUpDown),
  clear: wrap(X),
  back: wrap(ChevronLeft),
  next: wrap(ChevronRight),
  upload: wrap(Upload),
  download: wrap(Download),
  mapPin: wrap(MapPin),
  smile: wrap(Smile),
  tag: wrap(Tag),
} as const;
