export type Profile = {
  id: string;
  full_name: string | null;
  school: string | null;
  initials: string | null;
  is_admin: boolean;
  created_at: string;
};

export type Listing = {
  id: string;
  user_id: string;
  title: string;
  topic: string;
  condition: string;
  listing_type: "sell" | "donate";
  price: number | null;
  location: string;
  note: string | null;
  image_urls: string[];
  seller_initials: string | null;
  created_at: string;
};

export type ListingWithSeller = Listing & {
  seller_name?: string | null;
  seller_school?: string | null;
};

export type ListingRequest = {
  id: string;
  listing_id: string;
  buyer_id: string;
  message: string;
  status: "pending" | "accepted" | "declined" | "completed";
  created_at: string;
};

export type ListingRequestWithBuyer = ListingRequest & {
  buyer?: Pick<Profile, "full_name" | "school" | "initials"> | null;
  listing?: Pick<Listing, "title"> | null;
};
