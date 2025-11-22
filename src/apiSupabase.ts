import { supabase } from './supabaseClient';
import { Appointment, Service } from './types';

function mapServiceFromDb(row: any): Service {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price ?? 0),
    duration: Number(row.duration ?? 0),
    description: row.description ?? '',
  };
}

function mapServiceToDb(data: Omit<Service, 'id'>) {
  return {
    name: data.name,
    price: data.price,
    duration: data.duration,
    description: data.description,
  };
}

export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Erro ao buscar serviços', error);
    throw error;
  }
  return (data ?? []).map(mapServiceFromDb);
}

export async function insertService(data: Omit<Service, 'id'>): Promise<Service> {
  const payload = mapServiceToDb(data);
  const { data: rows, error } = await supabase
    .from('services')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('Erro ao inserir serviço', error);
    throw error;
  }
  return mapServiceFromDb(rows);
}

export async function updateService(id: string, data: Omit<Service, 'id'>): Promise<Service> {
  const payload = mapServiceToDb(data);
  const { data: rows, error } = await supabase
    .from('services')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Erro ao atualizar serviço', error);
    throw error;
  }
  return mapServiceFromDb(rows);
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao excluir serviço', error);
    throw error;
  }
}

function mapAppointmentFromDb(row: any): Appointment {
  return {
    id: row.id,
    clientName: row.client_name,
    phone: row.phone ?? '',
    date: row.date,
    time: row.time,
    serviceId: row.service_id,
    paymentMethod: row.payment_method ?? '',
    notes: row.notes ?? '',
    totalPrice: Number(row.total_price ?? 0),
    attended: row.attended ?? false,
  };
}

function mapAppointmentToDb(data: Omit<Appointment, 'id'>) {
  return {
    client_name: data.clientName,
    phone: data.phone,
    date: data.date,
    time: data.time,
    service_id: data.serviceId,
    payment_method: data.paymentMethod,
    notes: data.notes,
    total_price: data.totalPrice,
    attended: data.attended ?? false,
  };
}

export async function fetchAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    console.error('Erro ao buscar agendamentos', error);
    throw error;
  }
  return (data ?? []).map(mapAppointmentFromDb);
}

export async function insertAppointment(
  data: Omit<Appointment, 'id'>,
  serviceIds: string[],
): Promise<Appointment> {
  const payload = mapAppointmentToDb(data);
  const { data: rows, error } = await supabase
    .from('appointments')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('Erro ao inserir agendamento', error);
    throw error;
  }

  const created = mapAppointmentFromDb(rows);

  const allServiceIds =
    serviceIds && serviceIds.length > 0 ? serviceIds : [data.serviceId];

  if (allServiceIds.length > 0) {
    const linksPayload = allServiceIds.map((serviceId) => ({
      appointment_id: created.id,
      service_id: serviceId,
    }));

    const { error: linkError } = await supabase
      .from('appointment_services')
      .insert(linksPayload);

    if (linkError) {
      console.error('Erro ao vincular serviços ao agendamento', linkError);
    }
  }

  return created;
}

export async function updateAppointment(
  id: string,
  data: Omit<Appointment, 'id'>,
  serviceIds: string[],
): Promise<Appointment> {
  const payload = mapAppointmentToDb(data);
  const { data: rows, error } = await supabase
    .from('appointments')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Erro ao atualizar agendamento', error);
    throw error;
  }

  const updated = mapAppointmentFromDb(rows);

  const allServiceIds =
    serviceIds && serviceIds.length > 0 ? serviceIds : [data.serviceId];

  const { error: delError } = await supabase
    .from('appointment_services')
    .delete()
    .eq('appointment_id', id);

  if (delError) {
    console.error('Erro ao limpar serviços do agendamento', delError);
  }

  if (allServiceIds.length > 0) {
    const linksPayload = allServiceIds.map((serviceId) => ({
      appointment_id: id,
      service_id: serviceId,
    }));

    const { error: linkError } = await supabase
      .from('appointment_services')
      .insert(linksPayload);

    if (linkError) {
      console.error('Erro ao vincular serviços ao agendamento', linkError);
    }
  }

  return updated;
}

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao excluir agendamento', error);
    throw error;
  }

  // Opcional: limpar vínculos na appointment_services
  const { error: delError } = await supabase
    .from('appointment_services')
    .delete()
    .eq('appointment_id', id);

  if (delError) {
    console.error('Erro ao limpar serviços do agendamento ao excluir', delError);
  }
}

export async function toggleAttendance(id: string, attended: boolean): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ attended })
    .eq('id', id);

  if (error) {
    console.error('Erro ao alternar presença', error);
    throw error;
  }
}
