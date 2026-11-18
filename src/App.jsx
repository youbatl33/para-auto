
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

// Configuration Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "YOUR_SUPABASE_URL",
  import.meta.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY"
);

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [departureKm, setDepartureKm] = useState("");
  const [notes, setNotes] = useState("");

  const [returnKm, setReturnKm] = useState({});

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          loadProfile(newSession.user);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(user) {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      setMessage("تعذر تحميل معلومات الحساب: " + error.message);
      setLoading(false);
      return;
    }

    setProfile(data);
    await loadData(data);
    setLoading(false);
  }

  async function loadData(currentProfile) {
    const [d, v, t] = await Promise.all([
      supabase.from("drivers").select("*").eq("active", true),
      supabase.from("vehicles").select("*").eq("active", true),
      supabase.from("trips").select("*").order("created_at", {
        ascending: false
      })
    ]);

    if (d.error || v.error || t.error) {
      setMessage(
        "خطأ في تحميل البيانات: " +
        (d.error?.message || v.error?.message || t.error?.message)
      );
    }

    setDrivers(d.data || []);
    setVehicles(v.data || []);
    setTrips(t.data || []);
  }

  async function login(e) {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) setMessage(error.message);
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  async function createTrip(e) {
    e.preventDefault();
    setMessage("");

    if (!destination || !vehicleId || !driverId || !departureKm) {
      setMessage("يرجى ملء جميع المعلومات الضرورية");
      return;
    }

    const vehicleBusy = trips.some(
      t => t.vehicle_id === vehicleId && !t.return_at
    );

    if (vehicleBusy) {
      setMessage("هذه السيارة مستعملة حاليا في رحلة أخرى");
      return;
    }

    const driverBusy = trips.some(
      t => t.driver_id === driverId && !t.return_at
    );

    if (driverBusy) {
      setMessage("هذا السائق لديه رحلة لم يتم تسجيل الرجوع منها");
      return;
    }

    const selectedDriver = drivers.find(d => d.id === driverId);

    const { error } = await supabase.from("trips").insert({
      driver_id: driverId,
      vehicle_id: vehicleId,
      destination,
      purpose: purpose || null,
      departure_at: new Date().toISOString(),
      departure_km: Number(departureKm),
      notes: notes || null,
      status: "open",
      client_id: session.user.id,
      driver_name: selectedDriver?.full_name || null
    });

    if (error) {
      setMessage("تعذر تسجيل الرحلة: " + error.message);
      return;
    }

    setDestination("");
    setPurpose("");
    setVehicleId("");
    setDepartureKm("");
    setNotes("");

    setMessage("تم تسجيل الرحلة بنجاح");
    await loadData(profile);
  }

  async function finishTrip(trip) {
    const km = Number(returnKm[trip.id]);

    if (!km || km < trip.departure_km) {
      setMessage("يجب إدخال كيلومترات الرجوع بشكل صحيح");
      return;
    }

    const { error } = await supabase
      .from("trips")
      .update({
        return_at: new Date().toISOString(),
        return_km: km,
        status: "completed"
      })
      .eq("id", trip.id);

    if (error) {
      setMessage("تعذر تسجيل الرجوع: " + error.message);
      return;
    }

    setMessage("تم تسجيل رجوع السيارة بنجاح");
    await loadData(profile);
  }

  if (loading) {
    return <div className="loading">جاري تحميل PARA AUTO...</div>;
  }

  if (!session) {
    return (
      <main className="login-page" dir="rtl">
        <form className="login-card" onSubmit={login}>
          <h1>PARA AUTO</h1>
          <p>نظام تدبير وتتبع السيارات والرحلات</p>

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

          <button type="submit">تسجيل الدخول</button>
          {message && <p className="message">{message}</p>}
        </form>
      </main>
    );
  }

  const openTrips = trips.filter(t => !t.return_at);
  const completedTrips = trips.filter(t => t.return_at);

  return (
    <main className="app" dir="rtl">
      <header className="header">
        <div>
          <h1>PARA AUTO</h1>
          <p>تدبير أسطول السيارات</p>
        </div>

        <div className="user-info">
          <span>{profile?.full_name}</span>
          <span className="role">
            {isAdmin ? "المراقب الرئيسي" : profile?.role}
          </span>
          <button className="logout" onClick={logout}>
            خروج
          </button>
        </div>
      </header>

      {message && (
        <div className="message" role="status">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      <section className="stats">
        <div className="stat">
          <span>السيارات</span>
          <strong>{vehicles.length}</strong>
        </div>
        <div className="stat">
          <span>السائقون</span>
          <strong>{drivers.length}</strong>
        </div>
        <div className="stat">
          <span>الرحلات الجارية</span>
          <strong>{openTrips.length}</strong>
        </div>
        <div className="stat">
          <span>الرحلات المكتملة</span>
          <strong>{completedTrips.length}</strong>
        </div>
      </section>

      <section className="panel">
        <h2>تسجيل رحلة جديدة</h2>

        <form onSubmit={createTrip} className="trip-form">
          <label>السائق</label>
          <select
            value={driverId}
            onChange={e => setDriverId(e.target.value)}
            required
          >
            <option value="">اختر السائق</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>

          <label>السيارة</label>
          <select
            value={vehicleId}
            onChange={e => setVehicleId(e.target.value)}
            required
          >
            <option value="">اختر السيارة</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.plate} - {v.label}
              </option>
            ))}
          </select>

          <label>الوجهة</label>
          <input
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="مكان الوجهة"
            required
          />

          <label>الغرض من الرحلة</label>
          <input
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            placeholder="سبب التنقل"
          />

          <label>عداد الكيلومترات عند الانطلاق</label>
          <input
            type="number"
            min="0"
            value={departureKm}
            onChange={e => setDepartureKm(e.target.value)}
            required
          />

          <label>ملاحظات</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="ملاحظات إضافية"
          />

          <button type="submit">تسجيل الانطلاق</button>
        </form>
      </section>

      <section className="panel">
        <h2>الرحلات الجارية</h2>

        {openTrips.length === 0 ? (
          <p>لا توجد رحلات جارية حاليا</p>
        ) : (
          openTrips.map(trip => {
            const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
            const driver = drivers.find(d => d.id === trip.driver_id);

            return (
              <article className="trip-card" key={trip.id}>
                <h3>{trip.destination}</h3>
                <p>السائق: {driver?.full_name || trip.driver_name || "—"}</p>
                <p>السيارة: {vehicle?.plate || trip.vehicle_id}</p>
                <p>عداد الانطلاق: {trip.departure_km} km</p>
                <p>
                  وقت الانطلاق:{" "}
                  {trip.departure_at
                    ? new Date(trip.departure_at).toLocaleString("fr-FR")
                    : "—"}
                </p>

                <label>عداد الكيلومترات عند الرجوع</label>
                <input
                  type="number"
                  min={trip.departure_km}
                  value={returnKm[trip.id] || ""}
                  onChange={e =>
                    setReturnKm({
                      ...returnKm,
                      [trip.id]: e.target.value
                    })
                  }
                />

                <button onClick={() => finishTrip(trip)}>
                  تسجيل الرجوع
                </button>
              </article>
            );
          })
        )}
      </section>

      <section className="panel">
        <h2>سجل الرحلات</h2>

        {trips.map(trip => {
          const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
          const driver = drivers.find(d => d.id === trip.driver_id);

          return (
            <article className="history-card" key={trip.id}>
              <strong>{trip.destination}</strong>
              <p>السائق: {driver?.full_name || trip.driver_name || "—"}</p>
              <p>السيارة: {vehicle?.plate || "—"}</p>
              <p>الانطلاق: {trip.departure_km} km</p>
              <p>
                الرجوع: {trip.return_km ?? "لم يسجل بعد"}
                {trip.return_km != null ? " km" : ""}
              </p>
              <span className={trip.return_at ? "done" : "pending"}>
                {trip.return_at ? "مكتملة" : "جارية"}
              </span>
            </article>
          );
        })}
      </section>

      <footer>PARA AUTO © 2026</footer>
    </main>
  );
}
