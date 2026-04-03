export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
}

export interface Booking {
  id?: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  customerName: string;
  customerPhone: string;
}

export interface GalleryItem {
  id: string;
  url: string;
  caption?: string;
  createdAt: string;
}
