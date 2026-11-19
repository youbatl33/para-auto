
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const css = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    direction: "rtl",
    fontFamily: "Arial, sans-serif",
    color: "#172033"
  },
  header: {
    background: "#102b46",
    color: "white",
    padding: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10
  },
  container: {
    maxWidth: 1150,
    margin: "auto",
    padding: 16
  },
  card: {
    background: "white",
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
    boxShadow: "0 2px 8px #0000000c"
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    marginTop: 7,
    marginBottom: 14
  },
  button: {
    padding: "11px 16px",
    background: "#1675c1",
    color: "white",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    margin: 3
  },
  secondary: {
    padding: "10px 14px",
    background: "#e2e8f0",
    color: "#172033",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    margin: 3
  },
  danger: {
    padding: "9px 13px",
    background: "#dc2626",
    color: "white",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    margin: 3
  }
};

async function getAllRows(table) {
  let all = [];
  let start = 0;
  const size = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(start, start + size - 1);

    if (error) throw error;

    all.push(...(data || []));

    if (!data || data.length < size) break;
    start += size;
  }

  return all;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("trips");

  const [form, setForm] = useState({
    driver_name: "",
    vehicle_id: "",
    destination: "",
    purpose: "",
    departure_km: "",
    notes: ""
  });

  const [newDriverFirst, setNewDriverFirst] = useState("");
  const [newDriverLast, setNewDriverLast] = useState("");
  const [newDriverMatricule, setNewDriverMatricule] = useState("");

  const [newPlate, setNewPlate] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [returnKm, setReturnKm] = useState({});

  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");

  const isAdmin = profile?.role === "admin";

  const activeDrivers = drivers.filter(d => d.active !== false);
  const activeVehicles = vehicles.filter(v => v.active !== false);

  const openTrips = trips.filter(
    t => t.status === "out" && t.return_at == null
  );

  const completedTrips = trips.filter(
    t => t.status === "returned" && t.return_at != null
  );

  function driverName(id) {
    return drivers.find(d => d.id === id)?.full_name || "غير محدد";
  }

  function driverMatricule(id) {
    return drivers.find(d => d.id === id)?.matricule || "غير مسجل";
  }

  function vehicleName(id) {
    const v = vehicles.find(x => x.id === id);
    return v ? `${v.plate} ${v.label}` : "غير محددة";
  }

  const filteredTrips = trips.filter(t => {
    const search = historySearch.trim().toLowerCase();

    const values = [
      t.destination,
      t.driver_name || driverName(t.driver_id),
      driverMatricule(t.driver_id),
      t.vehicle_name || vehicleName(t.vehicle_id),
      t.purpose,
      t.notes
    ];

    const matchesSearch = values.some(value =>
      String(value || "").toLowerCase().includes(search)
    );

    const matchesStatus =
      historyStatus === "all" || t.status === historyStatus;

    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) setMessage(error.message);

      const current = data.session?.user || null;
      setUser(current);

      if (!current) setLoading(false);
    });

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);

        if (!session?.user) {
          setProfile(null);
          setDrivers([]);
          setVehicles([]);
          setTrips([]);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const { data: p, error: pe } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (pe) throw pe;

      if (!p || p.active === false) {
        await supabase.auth.signOut();
        setMessage("الحساب غير مفعل.");
        return;
      }

      setProfile(p);

      const [d, v, t] = await Promise.all([
        getAllRows("drivers"),
        getAllRows("vehicles"),
        getAllRows("trips")
      ]);

      setDrivers(d);
      setVehicles(v);

      setTrips(t.sort((a, b) =>
        new Date(b.created_at || b.departure_at) -
        new Date(a.created_at || a.departure_at)
      ));
    } catch (e) {
      setMessage("خطأ في تحميل البيانات: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function login(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) setMessage("تعذر الدخول: " + error.message);

    setSaving(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
  }

  function setFormValue(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function addDriver(e) {
    e.preventDefault();

    if (!isAdmin) {
      return setMessage("هذه العملية خاصة بالمراقب الرئيسي.");
    }

    const first = newDriverFirst.trim();
    const last = newDriverLast.trim();
    const matricule = newDriverMatricule.trim();

    if (!first || !last || !matricule) {
      return setMessage("يرجى إدخال الاسم الشخصي والنسب والماتريكيل.");
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase.from("drivers").insert({
        full_name: `${first} ${last}`,
        matricule,
        active: true
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("هذا الماتريكيل مسجل من قبل.");
        }
        throw error;
      }

      setNewDriverFirst("");
      setNewDriverLast("");
      setNewDriverMatricule("");

      setMessage("تمت إضافة السائق بنجاح.");
      await loadData();
    } catch (e) {
      setMessage("فشل إضافة السائق: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function addVehicle(e) {
    e.preventDefault();

    if (!isAdmin) {
      return setMessage("هذه العملية خاصة بالمراقب الرئيسي.");
    }

    const plate = newPlate.trim();
    const label = newLabel.trim();

    if (!plate || !label) {
      return setMessage("أدخل رقم التسجيل ونوع السيارة.");
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase.from("vehicles").insert({
        plate,
        label,
        active: true
      });

      if (error) throw error;

      setNewPlate("");
      setNewLabel("");
      setMessage("تمت إضافة السيارة بنجاح.");
      await loadData();
    } catch (e) {
      setMessage("فشل إضافة السيارة: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function editDriver(driver) {
    if (!isAdmin) return;

    const name = window.prompt(
      "الاسم الشخصي والنسب:",
      driver.full_name
    );

    if (name === null || !name.trim()) return;

    const matricule = window.prompt(
      "Matricule - الرقم التسلسلي:",
      driver.matricule || ""
    );

    if (matricule === null || !matricule.trim()) {
      return setMessage("الماتريكيل إجباري.");
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("drivers")
      .update({
        full_name: name.trim(),
        matricule: matricule.trim()
      })
      .eq("id", driver.id);

    setSaving(false);

    if (error) {
      setMessage(
        error.code === "23505"
          ? "هذا الماتريكيل مسجل عند سائق آخر."
          : "تعذر التعديل: " + error.message
      );
    } else {
      setMessage("تم تعديل معلومات السائق.");
      await loadData();
    }
  }

  async function editVehicle(vehicle) {
    if (!isAdmin) return;

    const plate = window.prompt("رقم التسجيل:", vehicle.plate);
    if (plate === null || !plate.trim()) return;

    const label = window.prompt("نوع السيارة:", vehicle.label);
    if (label === null || !label.trim()) return;

    setSaving(true);

    const { error } = await supabase
      .from("vehicles")
      .update({
        plate: plate.trim(),
        label: label.trim()
      })
      .eq("id", vehicle.id);

    setSaving(false);

    if (error) {
      setMessage("تعذر التعديل: " + error.message);
    } else {
      setMessage("تم تعديل السيارة.");
      await loadData();
    }
  }

  async function deactivateDriver(driver) {
    if (!isAdmin) return;

    if (openTrips.some(t => t.driver_id === driver.id)) {
      return setMessage("لا يمكن تعطيل سائق لديه رحلة مفتوحة.");
    }

    if (!window.confirm("هل تريد تعطيل هذا السائق؟")) return;

    setSaving(true);

    const { error } = await supabase
      .from("drivers")
      .update({ active: false })
      .eq("id", driver.id);

    setSaving(false);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("تم تعطيل السائق.");
      await loadData();
    }
  }

  async function deactivateVehicle(vehicle) {
    if (!isAdmin) return;

    if (openTrips.some(t => t.vehicle_id === vehicle.id)) {
      return setMessage("لا يمكن تعطيل سيارة لديها رحلة مفتوحة.");
    }

    if (!window.confirm("هل تريد تعطيل هذه السيارة؟")) return;

    setSaving(true);

    const { error } = await supabase
      .from("vehicles")
      .update({ active: false })
      .eq("id", vehicle.id);

    setSaving(false);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("تم تعطيل السيارة.");
      await loadData();
    }
  }

  // تسجيل رحلة باسم سائق مكتوب يدوياً
  async function addTrip(e) {
    e.preventDefault();

    if (
      !form.driver_name.trim() ||
      !form.vehicle_id ||
      !form.destination.trim() ||
      form.departure_km === ""
    ) {
      return setMessage("يرجى ملء جميع المعلومات الضرورية.");
    }

    const km = Number(form.departure_km);

    if (!Number.isInteger(km) || km < 0) {
      return setMessage("عداد الانطلاق غير صحيح.");
    }

    const vehicle = activeVehicles.find(v => v.id === form.vehicle_id);

    if (!vehicle) {
      return setMessage("السيارة غير متاحة.");
    }

    if (openTrips.some(t => t.vehicle_id === form.vehicle_id)) {
      return setMessage("هذه السيارة لديها رحلة مفتوحة بالفعل.");
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("trips")
        .insert({
          driver_id: null,
          driver_name: form.driver_name.trim(),
          vehicle_id: form.vehicle_id,
          destination: form.destination.trim(),
          purpose: form.purpose.trim() || null,
          departure_km: km,
          notes: form.notes.trim() || null,
          departure_at: new Date().toISOString(),
          return_at: null,
          return_km: null,
          status: "out",
          client_id: user.id,
          vehicle_name: `${vehicle.plate} ${vehicle.label}`
        });

      if (error) throw error;

      setForm({
        driver_name: "",
        vehicle_id: "",
        destination: "",
        purpose: "",
        departure_km: "",
        notes: ""
      });

      setMessage("تم تسجيل الرحلة بنجاح.");
      setTab("trips");
      await loadData();
    } catch (e) {
      setMessage("فشل تسجيل الرحلة: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function finishTrip(trip) {
    const value = returnKm[trip.id];

    if (value === undefined || value === "") {
      return setMessage("أدخل عداد الكيلومترات عند العودة.");
    }

    const km = Number(value);

    if (
      !Number.isInteger(km) ||
      km < Number(trip.departure_km)
    ) {
      return setMessage(
        "عداد العودة يجب أن يكون أكبر من أو يساوي عداد الانطلاق."
      );
    }

    if (!window.confirm("هل تريد تأكيد عودة السيارة؟")) return;

    setSaving(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("trips")
        .update({
          return_km: km,
          return_at: new Date().toISOString(),
          status: "returned"
        })
        .eq("id", trip.id)
        .eq("status", "out")
        .is("return_at", null)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("لم يتم تحديث الرحلة.");
      }

      setReturnKm(prev => ({ ...prev, [trip.id]: "" }));
      setMessage("تم تسجيل عودة السيارة بنجاح.");
      await loadData();
    } catch (e) {
      setMessage("تعذر تسجيل العودة: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ ...css.page, padding: 40, textAlign: "center" }}>
        جاري تحميل PARA AUTO...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={css.page}>
        <div style={{
          ...css.card,
          maxWidth: 420,
          margin: "70px auto",
          textAlign: "center"
        }}>
          <h1>🚘 PARA AUTO</h1>
          <p>نظام تدبير السيارات والرحلات</p>

          <form onSubmit={login}>
            <input
              style={css.input}
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <input
              style={css.input}
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            <button style={css.button} disabled={saving}>
              {saving ? "جاري الدخول..." : "دخول"}
            </button>
          </form>

          {message && <p>{message}</p>}
        </div>
      </div>
    );
  }

  const nav = (key, label) => (
    <button
      style={tab === key ? css.button : css.secondary}
      onClick={() => setTab(key)}
    >
      {label}
    </button>
  );

  return (
    <div style={css.page}>
      <header style={css.header}>
        <div>
          <h2 style={{ margin: 0 }}>🚘 PARA AUTO</h2>
          <div>نظام تدبير السيارات والرحلات</div>
          <small>{profile?.full_name || user.email}</small>
        </div>

        <button style={css.danger} onClick={logout}>
          خروج
        </button>
      </header>

      <main style={css.container}>
        {message && (
          <div style={{
            ...css.card,
            borderRight: "5px solid #1675c1"
          }}>
            {message}
            <button
              style={css.secondary}
              onClick={() => setMessage("")}
            >
              إغلاق
            </button>
          </div>
        )}

        {/* الإحصائيات */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))",
          gap: 12
        }}>
          {[
            ["السيارات", vehicles.length],
            ["السائقون المسجلون", drivers.length],
            ["الرحلات المفتوحة", openTrips.length],
            ["الرحلات المكتملة", completedTrips.length]
          ].map(([label, value]) => (
            <div key={label} style={css.card}>
              <div>{label}</div>
              <h2 style={{ marginBottom: 0 }}>{value}</h2>
            </div>
          ))}
        </div>

        {/* القائمة */}
        <div style={{
          ...css.card,
          display: "flex",
          flexWrap: "wrap",
          gap: 5
        }}>
          {nav("trips", "الرحلات")}
          {nav("new", "تسجيل رحلة")}
          {nav("history", "سجل الرحلات")}
          {nav("vehicles", "السيارات")}
          {nav("drivers", "السائقون")}
        </div>

        {/* تسجيل رحلة */}
        {tab === "new" && (
          <section style={css.card}>
            <h3>تسجيل رحلة جديدة</h3>

            <form onSubmit={addTrip}>
              <label>اسم السائق</label>
              <input
                style={css.input}
                type="text"
                placeholder="اكتب اسم السائق..."
                value={form.driver_name}
                onChange={e => setFormValue("driver_name", e.target.value)}
                required
              />

              <label>السيارة</label>
              <select
                style={css.input}
                value={form.vehicle_id}
                onChange={e => setFormValue("vehicle_id", e.target.value)}
                required
              >
                <option value="">اختر السيارة</option>
                {activeVehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.plate} - {v.label}
                  </option>
                ))}
              </select>

              <label>الوجهة</label>
              <input
                style={css.input}
                value={form.destination}
                onChange={e => setFormValue("destination", e.target.value)}
                required
              />

              <label>الغرض من الرحلة</label>
              <input
                style={css.input}
                value={form.purpose}
                onChange={e => setFormValue("purpose", e.target.value)}
              />

              <label>عداد الانطلاق (KM)</label>
              <input
                style={css.input}
                type="number"
                min="0"
                step="1"
                value={form.departure_km}
                onChange={e => setFormValue("departure_km", e.target.value)}
                required
              />

              <label>ملاحظات</label>
              <textarea
                style={css.input}
                value={form.notes}
                onChange={e => setFormValue("notes", e.target.value)}
              />

              <button style={css.button} disabled={saving}>
                {saving ? "جاري التسجيل..." : "تسجيل الرحلة"}
              </button>
            </form>
          </section>
        )}

        {/* الرحلات المفتوحة والمكتملة */}
        {tab === "trips" && (
          <>
            <section style={css.card}>
              <h3>الرحلات المفتوحة</h3>

              {openTrips.length === 0 && <p>لا توجد رحلات مفتوحة.</p>}

              {openTrips.map(t => (
                <div key={t.id} style={{
                  borderBottom: "1px solid #e2e8f0",
                  padding: "14px 0"
                }}>
                  <b>{t.destination}</b>
                  <p>السيارة: {t.vehicle_name || vehicleName(t.vehicle_id)}</p>
                  <p>السائق: {t.driver_name || driverName(t.driver_id)}</p>
                  {t.driver_id && <p>Matricule: {driverMatricule(t.driver_id)}</p>}
                  <p>عداد الانطلاق: {t.departure_km} KM</p>

                  <input
                    style={css.input}
                    type="number"
                    min={t.departure_km}
                    step="1"
                    placeholder="عداد العودة"
                    value={returnKm[t.id] || ""}
                    onChange={e => setReturnKm(prev => ({
                      ...prev,
                      [t.id]: e.target.value
                    }))}
                  />

                  <button
                    style={css.button}
                    disabled={saving}
                    onClick={() => finishTrip(t)}
                  >
                    تسجيل العودة
                  </button>
                </div>
              ))}
            </section>

            <section style={css.card}>
              <h3>الرحلات المكتملة</h3>

              {completedTrips.length === 0 && <p>لا توجد رحلات مكتملة.</p>}

              {completedTrips.map(t => (
                <div key={t.id} style={{
                  borderBottom: "1px solid #e2e8f0",
                  padding: "12px 0"
                }}>
                  <b>{t.destination}</b>
                  <p>السيارة: {t.vehicle_name || vehicleName(t.vehicle_id)}</p>
                  <p>السائق: {t.driver_name || driverName(t.driver_id)}</p>
                  {t.driver_id && <p>Matricule: {driverMatricule(t.driver_id)}</p>}
                  <p>عداد الانطلاق: {t.departure_km} KM</p>
                  <p>عداد العودة: {t.return_km} KM</p>
                  <p>
                    المسافة: {Number(t.return_km) - Number(t.departure_km)} KM
                  </p>
                  <small>
                    {t.return_at ? new Date(t.return_at).toLocaleString("fr-FR") : ""}
                  </small>
                </div>
              ))}
            </section>
          </>
        )}

        {/* سجل الرحلات */}
        {tab === "history" && (
          <section style={css.card} id="print-history">
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                #print-history, #print-history * {
                  visibility: visible !important;
                }
                #print-history {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  background: white;
                  color: black;
                  box-shadow: none;
                }
                .no-print { display: none !important; }
              }
            `}</style>

            <h2>📋 سجل جميع الرحلات</h2>

            <div className="no-print">
              <label>البحث عن رحلة</label>
              <input
                style={css.input}
                placeholder="السائق أو الماتريكيل أو السيارة أو الوجهة..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
              />

              <label>حالة الرحلة</label>
              <select
                style={css.input}
                value={historyStatus}
                onChange={e => setHistoryStatus(e.target.value)}
              >
                <option value="all">جميع الرحلات</option>
                <option value="out">الرحلات المفتوحة</option>
                <option value="returned">الرحلات المكتملة</option>
              </select>

              <button style={css.button} onClick={() => window.print()}>
                🖨️ طباعة السجل
              </button>

              <button style={css.secondary} onClick={loadData}>
                تحديث السجل ↻
              </button>
            </div>

            <p>عدد الرحلات: <b>{filteredTrips.length}</b></p>

            {filteredTrips.length === 0 ? (
              <p>لا توجد رحلات مطابقة للبحث.</p>
            ) : (
              filteredTrips.map(t => (
                <div key={t.id} style={{
                  borderBottom: "1px solid #ddd",
                  padding: 14,
                  marginBottom: 10,
                  pageBreakInside: "avoid"
                }}>
                  <h3>{t.destination}</h3>
                  <p>السائق: {t.driver_name || driverName(t.driver_id)}</p>
                  {t.driver_id && <p>Matricule: {driverMatricule(t.driver_id)}</p>}
                  <p>السيارة: {t.vehicle_name || vehicleName(t.vehicle_id)}</p>
                  <p>الغرض: {t.purpose || "غير محدد"}</p>
                  <p>عداد الانطلاق: {t.departure_km} KM</p>
                  <p>عداد العودة: {t.return_km ?? "لم تعد السيارة بعد"}</p>
                  <p>
                    المسافة المقطوعة: {
                      t.return_km != null
                        ? (Number(t.return_km) - Number(t.departure_km)) + " KM"
                        : "قيد الإنجاز"
                    }
                  </p>
                  <p>الحالة: {t.status === "returned" ? "مكتملة" : "مفتوحة"}</p>
                  <p>
                    تاريخ الانطلاق: {
                      t.departure_at
                        ? new Date(t.departure_at).toLocaleString("fr-FR")
                        : "-"
                    }
                  </p>
                  <p>
                    تاريخ العودة: {
                      t.return_at
                        ? new Date(t.return_at).toLocaleString("fr-FR")
                        : "-"
                    }
                  </p>
                  {t.notes && <p>ملاحظات: {t.notes}</p>}
                </div>
              ))
            )}
          </section>
        )}

        {/* إدارة السائقين المسجلين */}
        {tab === "drivers" && (
          <section style={css.card}>
            <h3>قائمة السائقين المسجلين</h3>

            {isAdmin && (
              <form onSubmit={addDriver}>
                <label>الاسم الشخصي</label>
                <input
                  style={css.input}
                  placeholder="أدخل الاسم الشخصي"
                  value={newDriverFirst}
                  onChange={e => setNewDriverFirst(e.target.value)}
                  required
                />

                <label>النسب</label>
                <input
                  style={css.input}
                  placeholder="أدخل النسب"
                  value={newDriverLast}
                  onChange={e => setNewDriverLast(e.target.value)}
                  required
                />

                <label>Matricule - الرقم التسلسلي</label>
                <input
                  style={css.input}
                  placeholder="أدخل الماتريكيل"
                  value={newDriverMatricule}
                  onChange={e => setNewDriverMatricule(e.target.value)}
                  required
                />

                <button style={css.button} disabled={saving}>
                  إضافة سائق
                </button>
              </form>
            )}

            {drivers.map(d => (
              <div key={d.id} style={{
                padding: 12,
                borderBottom: "1px solid #e2e8f0"
              }}>
                <b>{d.full_name}</b>
                <p>Matricule: {d.matricule || "غير مسجل"}</p>

                <span>{d.active === false ? "معطل" : "نشط"}</span>

                {isAdmin && d.active !== false && (
                  <>
                    <button
                      style={css.secondary}
                      onClick={() => editDriver(d)}
                      disabled={saving}
                    >
                      تعديل
                    </button>

                    <button
                      style={css.danger}
                      onClick={() => deactivateDriver(d)}
                      disabled={saving}
                    >
                      تعطيل
                    </button>
                  </>
                )}
              </div>
            ))}
          </section>
        )}

        {/* إدارة السيارات */}
        {tab === "vehicles" && (
          <section style={css.card}>
            <h3>قائمة السيارات</h3>

            {isAdmin && (
              <form onSubmit={addVehicle}>
                <label>رقم التسجيل</label>
                <input
                  style={css.input}
                  value={newPlate}
                  onChange={e => setNewPlate(e.target.value)}
                  placeholder="مثال: 12345-أ-6"
                  required
                />

                <label>نوع السيارة / اسمها</label>
                <input
                  style={css.input}
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="مثال: Dacia Logan"
                  required
                />

                <button style={css.button} disabled={saving}>
                  إضافة سيارة
                </button>
              </form>
            )}

            {vehicles.map(v => (
              <div key={v.id} style={{
                padding: 12,
                borderBottom: "1px solid #e2e8f0"
              }}>
                <b>{v.plate} - {v.label}</b>
                <span>{" — "}{v.active === false ? "معطلة" : "نشطة"}</span>

                {isAdmin && v.active !== false && (
                  <>
                    <button
                      style={css.secondary}
                      onClick={() => editVehicle(v)}
                      disabled={saving}
                    >
                      تعديل
                    </button>

                    <button
                      style={css.danger}
                      onClick={() => deactivateVehicle(v)}
                      disabled={saving}
                    >
                      تعطيل
                    </button>
                  </>
                )}
              </div>
            ))}
          </section>
        )}

        <div style={{
          textAlign: "center",
          padding: 20,
          color: "#64748b"
        }}>
          PARA AUTO © 2026
        </div>

        <button
          style={css.secondary}
          onClick={loadData}
          disabled={loading || saving}
        >
          تحديث البيانات ↻
        </button>
      </main>
    </div>
  );
}
