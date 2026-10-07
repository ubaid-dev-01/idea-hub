'use client';

import Link from 'next/link';
import { memo } from 'react';
import toast from 'react-hot-toast';

import { ICONS } from '@/lib/icons';

import { useIdeaPostCard } from './IdeaPostCardContext';

function IdeaPostMenuInner() {
  const {
    idea,
    author,
    isOwn,
    saved,
    following,
    fullUrl,
    menuOpen,
    setMenuOpen,
    setDelOpen,
    saveMut,
    followMut,
  } = useIdeaPostCard();

  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-full p-2 hover:bg-surface2 dark:hover:bg-[#242526]"
        aria-label="More"
        onClick={() => setMenuOpen((m) => !m)}
      >
        <ICONS.more size={20} />
      </button>
      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <ul className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl dark:border-slate-700/50 dark:bg-[#242526]">
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface2 dark:hover:bg-[#3a3b3c]"
                onClick={() => {
                  setMenuOpen(false);
                  void saveMut.mutateAsync({ saved }).catch(() => undefined);
                }}
              >
                {saved ? 'Unsave idea' : 'Save idea'}
              </button>
            </li>
            {author && !isOwn ? (
              <li>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface2 dark:hover:bg-[#3a3b3c]"
                  onClick={() => {
                    setMenuOpen(false);
                    void followMut.mutateAsync().catch(() => undefined);
                  }}
                >
                  {following ? 'Unfollow' : `Follow @${author.username}`}
                </button>
              </li>
            ) : null}
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface2 dark:hover:bg-[#3a3b3c]"
                onClick={() => {
                  setMenuOpen(false);
                  void navigator.clipboard.writeText(fullUrl);
                  toast.success('Link copied');
                }}
              >
                Share idea
              </button>
            </li>
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface2 dark:hover:bg-[#3a3b3c]"
                onClick={() => {
                  setMenuOpen(false);
                  toast('Thanks — our team will review this report.');
                }}
              >
                Report
              </button>
            </li>
            {isOwn ? (
              <>
                <li>
                  <Link
                    href={`/ideas/${idea._id}?edit=1`}
                    className="block px-3 py-2 text-sm hover:bg-surface2 dark:hover:bg-[#3a3b3c]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Edit
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => {
                      setMenuOpen(false);
                      setDelOpen(true);
                    }}
                  >
                    Delete
                  </button>
                </li>
              </>
            ) : null}
          </ul>
        </>
      ) : null}
    </div>
  );
}

export const IdeaPostMenu = memo(IdeaPostMenuInner);
