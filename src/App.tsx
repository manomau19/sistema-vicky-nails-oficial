import { useEffect, useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { Appointment, Service, User } from './types';
import {
  fetchAppointments,
  fetchServices,
  insertAppointment,
  insertService,
  updateAppointment,
  updateService,
  deleteAppointment,
  deleteService,
  toggleAttendance,
} from './apiSupabase';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [servicesData, appointmentsData] = await Promise.all([
          fetchServices(),
          fetchAppointments(),
        ]);
        setServices(servicesData);
        setAppointments(appointmentsData);
      } catch (err) {
        console.error('Erro ao carregar dados do Supabase', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function handleLogin(name: string) {
    setUser({ name });
  }

  function handleLogout() {
    setUser(null);
  }

  async function handleAddService(data: Omit<Service, 'id'>) {
    const created = await insertService(data);
    setServices((prev) => [...prev, created]);
  }

  async function handleUpdateService(id: string, data: Omit<Service, 'id'>) {
    const updated = await updateService(id, data);
    setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }

  async function handleDeleteService(id: string) {
    await deleteService(id);
    setServices((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleAddAppointment(
    data: Omit<Appointment, 'id'>,
    serviceIds: string[],
  ) {
    const created = await insertAppointment(data, serviceIds);
    setAppointments((prev) => [...prev, created]);
  }

  async function handleUpdateAppointment(
    id: string,
    data: Omit<Appointment, 'id'>,
    serviceIds: string[],
  ) {
    const updated = await updateAppointment(id, data, serviceIds);
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
  }

  async function handleDeleteAppointment(id: string) {
    await deleteAppointment(id);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleToggleAppointmentAttendance(id: string) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, attended: !a.attended } : a)),
    );

    const current = appointments.find((a) => a.id === id);
    const newValue = !(current?.attended ?? false);

    try {
      await toggleAttendance(id, newValue);
    } catch (err) {
      console.error('Erro ao atualizar presença no Supabase', err);
    }
  }

  if (loading) {
    return <div style={{ padding: 32 }}>Carregando agenda na nuvem...</div>;
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Dashboard
      userName={user.name}
      services={services}
      appointments={appointments}
      onAddService={handleAddService}
      onUpdateService={handleUpdateService}
      onDeleteService={handleDeleteService}
      onAddAppointment={handleAddAppointment}
      onUpdateAppointment={handleUpdateAppointment}
      onDeleteAppointment={handleDeleteAppointment}
      onToggleAppointmentAttendance={handleToggleAppointmentAttendance}
      onLogout={handleLogout}
    />
  );
}

export default App;
