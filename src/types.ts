export type Service = {
  id: string;
  name: string;
  price: number;
  duration: number;      // minutos
  description: string;
};

export type Appointment = {
  id: string;
  clientName: string;
  phone: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:mm
  serviceId: string;
  paymentMethod: string;
  notes: string;
  attended?: boolean;    // presença confirmada
};

export type User = {
  name: string;
};
