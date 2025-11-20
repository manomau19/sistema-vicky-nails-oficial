import { Appointment, Service, User } from './types';

const SERVICES_KEY = 'nails.services';
const APPOINTMENTS_KEY = 'nails.appointments';
const USER_KEY = 'nails.user';

function safeLoad<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error('Erro ao ler do localStorage', err);
    return fallback;
  }
}

function safeSave<T>(key: string, value: T | null) {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (err) {
    console.error('Erro ao salvar no localStorage', err);
  }
}

export function loadServices(): Service[] {
  return safeLoad<Service[]>(SERVICES_KEY, []);
}

export function saveServices(services: Service[]): void {
  safeSave(SERVICES_KEY, services);
}

export function loadAppointments(): Appointment[] {
  return safeLoad<Appointment[]>(APPOINTMENTS_KEY, []);
}

export function saveAppointments(appointments: Appointment[]): void {
  safeSave(APPOINTMENTS_KEY, appointments);
}

export function loadUser(): User | null {
  return safeLoad<User | null>(USER_KEY, null);
}

export function saveUser(user: User | null): void {
  safeSave(USER_KEY, user);
}
