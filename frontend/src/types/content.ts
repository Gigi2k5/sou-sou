export interface ArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  likeCount: number;
  commentCount: number;
  /** True si l'utilisateur courant a liké. */
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
}

export interface Article extends ArticleListItem {
  content: string;
}

export interface ArticleLikeStatus {
  liked: boolean;
  likeCount: number;
}

export interface ArticleComment {
  id: string;
  articleId: string;
  body: string;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
}

export interface ArticleCommentsList {
  items: ArticleComment[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export interface ArticlesList {
  items: ArticleListItem[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export interface Resource {
  id: string;
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  youtubeUrl: string;
  description: string | null;
  category: string | null;
  position?: number;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResourcesList {
  items: Resource[];
  categories: string[];
}
