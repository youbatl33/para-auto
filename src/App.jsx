
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ogmxkpzznvgvqkajyuse.supabase.co',
  'sb_publishable_e4wuJmyvETcYnmhzYS0Xkw_XWWn067Y'
);

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [driverName, setDriverName] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [plate, setPlate] = useState('');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [km, setKm] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadData();
    });

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session) loadData();
        else {
          setProfile(null);
          setTrips([]);
        }
      });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadData() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const [p, d, v, t] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('drivers').select('*').eq('active', true),
      supabase.from('vehicles').select('*').eq('active', true),
      supabase.from('trips').select('*').order('departure_at', { ascending: false })
    ]);

    if (p.error) setMessage(p.error.message);
    setProfile(p.data || null);
    setDrivers(d.data || []);
    setVehicles(v.data || []);
    setTrips(t.data || []);
  }

  async function login(e) {
    e.preventDefault();
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) setMessage(error.message);
  }

  async function logout() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  async function startTrip(e) {
    e.preventDefault();
    setMessage('');

    if (!driverName.trim() || !vehicleName.trim() ||
        !destination.trim() || km === '') {
      setMessage('يرجى ملء اسم السائق والسيارة والوجهة والعداد');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    let vehicleId = null;

    // البحث عن السيارة برقم التسجيل
    if (plate.trim()) {
      const { data: existingVehicle, error: searchError } =
        await supabase.from('vehicles')
          .select('id')
          .eq('plate', plate.trim())
          .maybeSingle();

      if (searchError) {
        setMessage(searchError.message);
        return;
      }

      if (existingVehicle) {
        vehicleId = existingVehicle.id;
      } else if (profile?.role === 'admin') {
        const { data: newVehicle, error: insertVehicleError } =
          await supabase.from('vehicles')
            .insert({
              plate: plate.trim(),
              label: vehicleName.trim(),
              active: true
            })
            .select('id')
            .single();

        if (insertVehicleError) {
          setMessage(insertVehicleError.message);
          return;
        }

        vehicleId = newVehicle.id;
      }
    }

    const { error } = await supabase.from('trips').insert({
      driver_id: profile?.role === 'admin' ? null : user.id,
      driver_name: driverName.trim(),
      vehicle_id: vehicleId,
      vehicle_name: vehicleName.trim(),
      destination: destination.trim(),
      purpose: purpose.trim(),
      departure_km: Number(km),
      departure_at: new Date().toISOString(),
      status: 'open'
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('تم تسجيل الانطلاق بنجاح');
    setDriverName('');
    setVehicleName('');
    setPlate('');
    setDestination('');
    setPurpose('');
    setKm('');
    await loadData();
  }

  async function finishTrip(trip) {
    const returnKm = prompt('أدخل عداد الكيلومترات عند الرجوع');

    if (returnKm === null || returnKm.trim() === '' ||
        !Number.isFinite(Number(returnKm)) ||
        Number(returnKm) < Number(trip.departure_km)) {
      setMessage('قيمة الكيلومترات غير صحيحة');
      return;
    }

    const { error } = await supabase.from('trips').update({
      return_at: new Date().toISOString(),
      return_km: Number(returnKm),
      status: 'closed'
    }).eq('id', trip.id).is('return_at', null);

    setMessage(error ? error.message : 'تم تسجيل الرجوع بنجاح');
    await loadData();
  }

  if (!session) {
    return (
      <main className="login">
        <h1>PARA AUTO</h1>
        <p>نظام تدبير السيارات والرحلات</p>
        <form onSubmit={login}>
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button>دخول</button>
        </form>
        <p>{message}</p>
      </main>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <main className="app">
      <header>
        <div>
          <h1>PARA AUTO</h1>
          <p>{profile?.full_name || session.user.email}</p>
        </div>
        <button onClick={logout}>خروج</button>
      </header>

      <h2>{isAdmin ? 'لوحة المراقب الرئيسي' : 'فضاء السائق'}</h2>
      <p className="notice">{message}</p>

      <section className="panel">
        <h3>تسجيل انطلاق رحلة</h3>

        <form onSubmit={startTrip}>
          <label>اسم السائق</label>
          <input
            value={driverName}
            onChange={e => setDriverName(e.target.value)}
            placeholder="اكتب اسم السائق"
            required
          />

          <label>اسم السيارة</label>
          <input
            value={vehicleName}
            onChange={e => setVehicleName(e.target.value)}
            placeholder="اكتب اسم السيارة"
            required
          />

          <label>رقم تسجيل السيارة</label>
          <input
            value={plate}
            onChange={e => setPlate(e.target.value)}
            placeholder="مثال: 12345-أ-6"
          />

          <label>الوجهة</label>
          <input
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="اكتب الوجهة"
            required
          />

          <label>سبب التنقل</label>
          <input
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
          />

          <label>عداد الكيلومترات عند الانطلاق</label>
          <input
            type="number"
            min="0"
            value={km}
            onChange={e => setKm(e.target.value)}
            required
          />

          <button type="submit">تسجيل الانطلاق</button>
        </form>
      </section>

      <section className="panel">
        <h3>{isAdmin ? 'جميع الرحلات' : 'رحلاتي'}</h3>

        {trips
          .filter(t => isAdmin || t.driver_id === profile?.id)
          .map(t => (
            <article className="trip" key={t.id}>
              <b>{t.destination}</b>
              <p>السائق: {t.driver_name || 'غير محدد'}</p>
              <p>السيارة: {t.vehicle_name || 'غير محددة'}</p>
              <p>رقم التسجيل: {t.vehicle_id || 'غير مرتبط'}</p>
              <p>سبب التنقل: {t.purpose || 'غير محدد'}</p>
              <p>الحالة: {t.return_at ? 'مغلقة' : 'مفتوحة'}</p>
              <p>عداد الانطلاق: {t.departure_km}</p>

              {t.return_at ? (
                <p>عداد الرجوع: {t.return_km}</p>
              ) : (
                <button onClick={() => finishTrip(t)}>
                  تسجيل الرجوع
                </button>
              )}
            </article>
          ))}
      </section>

      {isAdmin && (
        <>
          <section className="panel">
            <h3>السائقون المسجلون</h3>
            {drivers.map(d => <p key={d.id}>{d.full_name}</p>)}
          </section>

          <section className="panel">
            <h3>السيارات المسجلة</h3>
            {vehicles.map(v => (
              <p key={v.id}>{v.label} - {v.plate}</p>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
