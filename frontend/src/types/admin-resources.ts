export interface AdminResource {
  id: string;
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  youtubeUrl: string;
  description: string | null;
  category: string | null;
  position: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  addedById: string | null;
  addedBy: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
}

export interface AdminResourcesList {
  items: AdminResource[];
}

export interface CreateAdminResourceInput {
  youtubeUrl: string;
  category?: string;
  description?: string;
}

export interface UpdateAdminResourceInput {
  category?: string;
  description?: string;
  isFeatured?: boolean;
}
