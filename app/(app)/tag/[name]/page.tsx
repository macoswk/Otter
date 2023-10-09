import { Feed } from '@/src/components/Feed';
import { CONTENT } from '@/src/constants';
import { Bookmark } from '@/src/types/db';
import { Database } from '@/src/types/supabase';
import { type ApiParameters } from '@/src/utils/fetching/apiParameters';
import { getBookmarks } from '@/src/utils/fetching/bookmarks';
import { Hash } from '@phosphor-icons/react/dist/ssr';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { Metadata } from 'next';
import { cookies } from 'next/headers';

type Props = {
  params: { name: string };
  searchParams: Partial<ApiParameters>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Tag: #${decodeURIComponent(params.name)}`,
  };
}

export default async function TagPage({ params, searchParams }: Props) {
  const { limit, offset } = searchParams;
  const supabaseClient = createServerComponentClient<Database>({ cookies });
  const tag = decodeURIComponent(params.name);
  const { data, count } = await getBookmarks({
    supabaseClient,
    params: { ...searchParams, tag },
  });
  return (
    <Feed
      items={data as Bookmark[]}
      count={count || 0}
      limit={limit}
      offset={offset}
      allowGroupByDate={true}
      title={tag}
      icon={<Hash weight="duotone" size={24} />}
      feedType="bookmarks"
    />
  );
}
