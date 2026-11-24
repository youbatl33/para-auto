
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

const emptyForm = {
  driver_name: "",
  driver_matricule: "",
  vehicle_name: "",
  destination: "",
  purpose: "",
  departure_km: "",
  notes: ""
};

function generateReturnCode() {
  const bytes = new Uint8Array(8);
  window.crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

// تنسيق التاريخ والوقت حسب توقيت الهاتف
function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

// تنسيق الساعة فقط
function formatTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [tab, setTab] = useState("trips");

  const [form, setForm] = useState(emptyForm);

  const [newDriverFirst, setNewDriverFirst] = useState("");
  const [newDriverLast, setNewDriverLast] = useState("");
  const [newDriverMatricule, setNewDriverMatricule] = useState("");

  const [newPlate, setNewPlate] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const [returnKm, setReturnKm] = useState({});
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");

  // بيانات تسجيل العودة بدون حساب
  const [newTripCode, setNewTripCode] = useState("");
  const [returnCodeInput, setReturnCodeInput] = useState("");
  const [returnKmInput, setReturnKmInput] = useState("");

  const isAdmin = profile?.role === "admin";

  const openTrips = trips.filter(
    t => t.status === "out" && t.return_at == null
  );

  const completedTrips = trips.filter(
    t => t.status === "returned" && t.return_at != null
  );

  function setFormValue(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

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
      t.driver_matricule || driverMatricule(t.driver_id),
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

  // مراقبة حالة تسجيل الدخول
  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) setMessage(error.message);

      const current = data.session?.user || null;
      setUser(current);

      if (!current) setLoading(false);
    }

    checkSession();

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

  // تحميل بيانات المراقب
  async function loadData() {
    if (!user) return;

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

      setTrips(
        t.sort((a, b) =>
          new Date(b.created_at || b.departure_at) -
          new Date(a.created_at || a.departure_at)
        )
      );

    } catch (e) {
      setMessage("خطأ في تحميل البيانات: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // الدخول
  async function login(e) {
    e.preventDefault();

    setSaving(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage("تعذر الدخول: " + error.message);
    }

    setSaving(false);
  }

  // الخروج
  async function logout() {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setShowLogin(false);
  }

  // إضافة سائق
  async function addDriver(e) {
    e.preventDefault();

    if (!isAdmin) {
      return setMessage("هذه العملية خاصة بالمراقب الرئيسي.");
    }

    const first = newDriverFirst.trim();
    const last = newDriverLast.trim();
    const matricule = newDriverMatricule.trim();

    if (!first || !last || !matricule) {
      return setMessage("يرجى إدخال الاسم والنسب والماتريكيل.");
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("drivers").insert({
        full_name: `${first} ${last}`,
        matricule,
        active: true
      });

      if (error) throw error;

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

  // إضافة سيارة
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

  // تعديل سائق
  async function editDriver(driver) {
    if (!isAdmin) return;

    const name = window.prompt(
      "الاسم الشخصي والنسب:",
      driver.full_name
    );

    if (name === null || !name.trim()) return;

    const matricule = window.prompt(
      "Matricule:",
      driver.matricule || ""
    );

    if (matricule === null || !matricule.trim()) return;

    setSaving(true);

    const { error } = await supabase
      .from("drivers")
      .update({
        full_name: name.trim(),
        matricule: matricule.trim()
      })
      .eq("id", driver.id);

    setSaving(false);

    if (error) {
      setMessage("تعذر التعديل: " + error.message);
    } else {
      setMessage("تم تعديل معلومات السائق.");
      await loadData();
    }
  }

  // تعديل سيارة
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

  // تعطيل سائق
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

  // تعطيل سيارة
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

  // تسجيل رحلة جديدة
  async function addTrip(e) {
    e.preventDefault();

    if (
      !form.driver_name.trim() ||
      !form.driver_matricule.trim() ||
      !form.vehicle_name.trim() ||
      !form.destination.trim() ||
      form.departure_km === ""
    ) {
      return setMessage("يرجى ملء جميع الخانات الإجبارية.");
    }

    const km = Number(form.departure_km);

    if (!Number.isInteger(km) || km < 0) {
      return setMessage("عداد الانطلاق غير صحيح.");
    }

    setSaving(true);
    setMessage("");
    setNewTripCode("");

    const generatedCode = generateReturnCode();

    // تسجيل وقت الانطلاق لحظة تأكيد الرحلة
    const departureTime = new Date().toISOString();

    try {
      const { error } = await supabase
        .from("trips")
        .insert({
          driver_id: null,
          driver_name: form.driver_name.trim(),
          driver_matricule: form.driver_matricule.trim(),
          vehicle_id: null,
          vehicle_name: form.vehicle_name.trim(),
          destination: form.destination.trim(),
          purpose: form.purpose.trim() || null,
          departure_km: km,
          notes: form.notes.trim() || null,
          departure_at: departureTime,
          return_at: null,
          return_km: null,
          status: "out",
          client_id: user?.id || null,
          return_code: generatedCode
        });

      if (error) throw error;

      setForm(emptyForm);
      setNewTripCode(generatedCode);

      setMessage(
        "تم تسجيل الرحلة بنجاح. احتفظ بالرمز السري لتسجيل العودة."
      );

      if (user) {
        setTab("trips");
        await loadData();
      }

    } catch (e) {
      setMessage("فشل تسجيل الرحلة: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  // تسجيل العودة للمراقب
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

    // تسجيل وقت العودة لحظة التأكيد
    const returnTime = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from("trips")
        .update({
          return_km: km,
          return_at: returnTime,
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

      setReturnKm(prev => ({
        ...prev,
        [trip.id]: ""
      }));

      setMessage("تم تسجيل عودة السيارة بنجاح.");
      await loadData();

    } catch (e) {
      setMessage("تعذر تسجيل العودة: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  // تسجيل العودة بدون حساب باستعمال الرمز السري
  async function registerAnonymousReturn(e) {
    e.preventDefault();

    const code = returnCodeInput.trim().toUpperCase();
    const km = Number(returnKmInput);

    if (!code || code.length < 12) {
      return setMessage("أدخل الرمز السري الصحيح.");
    }

    if (
      returnKmInput === "" ||
      !Number.isInteger(km) ||
      km < 0
    ) {
      return setMessage("أدخل عداد العودة بشكل صحيح.");
    }

    if (!window.confirm("هل تريد تأكيد تسجيل عودة السيارة؟")) return;

    setSaving(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "register_trip_return",
        {
          p_return_code: code,
          p_return_km: km
        }
      );

      if (error) throw error;

      if (data !== true) {
        throw new Error(
          "الرمز غير صحيح، أو الرحلة مكتملة من قبل، أو عداد العودة أقل من عداد الانطلاق."
        );
      }

      setReturnCodeInput("");
      setReturnKmInput("");
      setNewTripCode("");

      setMessage("تم تسجيل عودة السيارة بنجاح.");

      if (user) {
        await loadData();
      }

    } catch (e) {
      setMessage("تعذر تسجيل العودة: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  // نسخ الرمز السري
  async function copyReturnCode() {
    try {
      await navigator.clipboard.writeText(newTripCode);
      setMessage("تم نسخ الرمز السري بنجاح.");
    } catch {
      setMessage("تعذر نسخ الرمز. يرجى الاحتفاظ به يدوياً.");
    }
  }

  // شاشة التحميل
  if (loading) {
    return (
      <div style={{
        ...css.page,
        padding: 40,
        textAlign: "center"
      }}>
        جاري تحميل PARA AUTO...
      </div>
    );
  }

  // صفحة المستخدم بدون تسجيل الدخول
  if (!user) {
    return (
      <div style={css.page}>
        <header style={css.header}>
          <div>
            <h2 style={{ margin: 0 }}>🚘 PARA AUTO</h2>
            <div>نظام تدبير السيارات والرحلات</div>
          </div>

          <button
            style={css.secondary}
            onClick={() => setShowLogin(!showLogin)}
          >
            {showLogin ? "تسجيل رحلة" : "دخول المراقب"}
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

          {showLogin ? (
            <section style={css.card}>
              <h3>🔐 دخول المراقب الرئيسي</h3>

              <form onSubmit={login}>
                <label>البريد الإلكتروني</label>
                <input
                  style={css.input}
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />

                <label>كلمة المرور</label>
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
            </section>
          ) : (
            <section style={css.card}>
              <h3>🚘 تسجيل رحلة جديدة</h3>
              <p>يمكنك تسجيل الرحلة دون إنشاء حساب.</p>

              <form onSubmit={addTrip}>
                <label>اسم السائق</label>
                <input
                  style={css.input}
                  placeholder="الاسم الشخصي والنسب"
                  value={form.driver_name}
                  onChange={e =>
                    setFormValue("driver_name", e.target.value)
                  }
                  required
                />

                <label>Matricule السائق</label>
                <input
                  style={css.input}
                  placeholder="Matricule السائق"
                  value={form.driver_matricule}
                  onChange={e =>
                    setFormValue("driver_matricule", e.target.value)
                  }
                  required
                />

                <label>السيارة ورقم التسجيل</label>
                <input
                  style={css.input}
                  placeholder="مثال: Dacia Logan - 12345 أ 6"
                  value={form.vehicle_name}
                  onChange={e =>
                    setFormValue("vehicle_name", e.target.value)
                  }
                  required
                />

                <label>الوجهة</label>
                <input
                  style={css.input}
                  placeholder="أدخل الوجهة"
                  value={form.destination}
                  onChange={e =>
                    setFormValue("destination", e.target.value)
                  }
                  required
                />

                <label>الغرض من الرحلة</label>
                <input
                  style={css.input}
                  placeholder="الغرض من الرحلة"
                  value={form.purpose}
                  onChange={e =>
                    setFormValue("purpose", e.target.value)
                  }
                />

                <label>عداد الانطلاق (KM)</label>
                <input
                  style={css.input}
                  type="number"
                  min="0"
                  step="1"
                  value={form.departure_km}
                  onChange={e =>
                    setFormValue("departure_km", e.target.value)
                  }
                  required
                />

                <label>ملاحظات</label>
                <textarea
                  style={css.input}
                  placeholder="ملاحظات إضافية..."
                  value={form.notes}
                  onChange={e =>
                    setFormValue("notes", e.target.value)
                  }
                />

                <button style={css.button} disabled={saving}>
                  {saving ? "جاري التسجيل..." : "تأكيد تسجيل الرحلة"}
                </button>
              </form>
            </section>
          )}

          {/* إظهار الرمز بعد تسجيل الرحلة */}
          {newTripCode && (
            <section style={{
              ...css.card,
              border: "2px solid #16a34a",
              textAlign: "center"
            }}>
              <h3>✅ تم تسجيل الرحلة بنجاح</h3>

              <p>
                احتفظ بهذا الرمز السري، ستحتاج إليه عند عودة السيارة:
              </p>

              <h2 style={{
                direction: "ltr",
                letterSpacing: 3,
                color: "#166534",
                overflowWrap: "anywhere"
              }}>
                {newTripCode}
              </h2>

              <button
                style={css.button}
                onClick={copyReturnCode}
              >
                نسخ الرمز السري
              </button>
            </section>
          )}

          {/* تسجيل العودة بدون حساب */}
          <section style={css.card}>
            <h3>🔑 تسجيل عودة السيارة</h3>

            <p>
              أدخل الرمز السري الذي حصلت عليه عند تسجيل الرحلة.
            </p>

            <form onSubmit={registerAnonymousReturn}>
              <label>الرمز السري للرحلة</label>

              <input
                style={css.input}
                value={returnCodeInput}
                onChange={e => setReturnCodeInput(e.target.value)}
                placeholder="أدخل الرمز السري"
                required
              />

              <label>عداد الكيلومترات عند العودة (KM)</label>

              <input
                style={css.input}
                type="number"
                min="0"
                step="1"
                value={returnKmInput}
                onChange={e => setReturnKmInput(e.target.value)}
                placeholder="عداد العودة"
                required
              />

              <button style={css.button} disabled={saving}>
                {saving
                  ? "جاري تسجيل العودة..."
                  : "تأكيد عودة السيارة"}
              </button>
            </form>
          </section>

          <div style={{
            textAlign: "center",
            padding: 20,
            color: "#64748b"
          }}>
            PARA AUTO © 2026
          </div>
        </main>
      </div>
    );
  }

  // قائمة المراقب
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
            ["السيارات المسجلة", vehicles.length],
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
            <h3>🚘 تسجيل رحلة جديدة</h3>

            <form onSubmit={addTrip}>
              <label>اسم السائق</label>
              <input
                style={css.input}
                placeholder="الاسم الشخصي والنسب"
                value={form.driver_name}
                onChange={e =>
                  setFormValue("driver_name", e.target.value)
                }
                required
              />

              <label>Matricule السائق</label>
              <input
                style={css.input}
                placeholder="Matricule السائق"
                value={form.driver_matricule}
                onChange={e =>
                  setFormValue("driver_matricule", e.target.value)
                }
                required
              />

              <label>السيارة ورقم التسجيل</label>
              <input
                style={css.input}
                placeholder="مثال: Dacia Logan - 12345 أ 6"
                value={form.vehicle_name}
                onChange={e =>
                  setFormValue("vehicle_name", e.target.value)
                }
                required
              />

              <label>الوجهة</label>
              <input
                style={css.input}
                placeholder="أدخل الوجهة"
                value={form.destination}
                onChange={e =>
                  setFormValue("destination", e.target.value)
                }
                required
              />

              <label>الغرض من الرحلة</label>
              <input
                style={css.input}
                value={form.purpose}
                onChange={e =>
                  setFormValue("purpose", e.target.value)
                }
              />

              <label>عداد الانطلاق (KM)</label>
              <input
                style={css.input}
                type="number"
                min="0"
                step="1"
                value={form.departure_km}
                onChange={e =>
                  setFormValue("departure_km", e.target.value)
                }
                required
              />

              <label>ملاحظات</label>
              <textarea
                style={css.input}
                value={form.notes}
                onChange={e =>
                  setFormValue("notes", e.target.value)
                }
              />

              <button style={css.button} disabled={saving}>
                {saving ? "جاري التسجيل..." : "تسجيل الرحلة"}
              </button>
            </form>

            {newTripCode && (
              <div style={{
                border: "2px solid #16a34a",
                borderRadius: 10,
                padding: 15,
                marginTop: 15,
                textAlign: "center"
              }}>
                <h3>رمز العودة الخاص بالرحلة</h3>
                <h2 style={{
                  direction: "ltr",
                  color: "#166534",
                  overflowWrap: "anywhere"
                }}>
                  {newTripCode}
                </h2>
                <button
                  style={css.button}
                  onClick={copyReturnCode}
                >
                  نسخ الرمز
                </button>
              </div>
            )}
          </section>
        )}

        {/* الرحلات المفتوحة والمكتملة */}
        {tab === "trips" && (
          <>
            <section style={css.card}>
              <h3>🚗 الرحلات المفتوحة</h3>

              {openTrips.length === 0 && (
                <p>لا توجد رحلات مفتوحة.</p>
              )}

              {openTrips.map(t => (
                <div key={t.id} style={{
                  borderBottom: "1px solid #e2e8f0",
                  padding: "14px 0"
                }}>
                  <b>{t.destination}</b>

                  <p>
                    السيارة: {t.vehicle_name || vehicleName(t.vehicle_id)}
                  </p>

                  <p>
                    السائق: {t.driver_name || driverName(t.driver_id)}
                  </p>

                  <p>
                    Matricule: {t.driver_matricule || driverMatricule(t.driver_id)}
                  </p>

                  <p>عداد الانطلاق: {t.departure_km} KM</p>

                  <p>
                    🕒 وقت الانطلاق:
                    <b> {formatDateTime(t.departure_at)}</b>
                  </p>

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
              <h3>✅ الرحلات المكتملة</h3>

              {completedTrips.length === 0 && (
                <p>لا توجد رحلات مكتملة.</p>
              )}

              {completedTrips.map(t => (
                <div key={t.id} style={{
                  borderBottom: "1px solid #e2e8f0",
                  padding: 12
                }}>
                  <b>{t.destination}</b>

                  <p>
                    السيارة: {t.vehicle_name || vehicleName(t.vehicle_id)}
                  </p>

                  <p>
                    السائق: {t.driver_name || driverName(t.driver_id)}
                  </p>

                  <p>
                    Matricule: {t.driver_matricule || driverMatricule(t.driver_id)}
                  </p>

                  <p>عداد الانطلاق: {t.departure_km} KM</p>
                  <p>عداد العودة: {t.return_km} KM</p>

                  <p>
                    المسافة: {Number(t.return_km) - Number(t.departure_km)} KM
                  </p>

                  <p>
                    🕒 وقت الانطلاق:
                    <b> {formatDateTime(t.departure_at)}</b>
                  </p>

                  <p>
                    🕒 وقت العودة:
                    <b> {formatDateTime(t.return_at)}</b>
                  </p>
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

              <button
                style={css.button}
                onClick={() => window.print()}
              >
                🖨️ طباعة السجل
              </button>

              <button
                style={css.secondary}
                onClick={loadData}
              >
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

                  <p>
                    السائق: {t.driver_name || driverName(t.driver_id)}
                  </p>

                  <p>
                    Matricule: {t.driver_matricule || driverMatricule(t.driver_id)}
                  </p>

                  <p>
                    السيارة: {t.vehicle_name || vehicleName(t.vehicle_id)}
                  </p>

                  <p>الغرض: {t.purpose || "غير محدد"}</p>
                  <p>عداد الانطلاق: {t.departure_km} KM</p>

                  <p>
                    عداد العودة: {t.return_km ?? "لم تعد السيارة بعد"}
                  </p>

                  <p>
                    المسافة المقطوعة: {
                      t.return_km != null
                        ? (Number(t.return_km) - Number(t.departure_km)) + " KM"
                        : "قيد الإنجاز"
                    }
                  </p>

                  <p>
                    الحالة: {t.status === "returned" ? "مكتملة" : "مفتوحة"}
                  </p>

                  <p>
                    🕒 تاريخ ووقت الانطلاق:
                    <b> {formatDateTime(t.departure_at)}</b>
                  </p>

                  <p>
                    🕒 تاريخ ووقت العودة:
                    <b> {formatDateTime(t.return_at)}</b>
                  </p>

                  {t.notes && <p>ملاحظات: {t.notes}</p>}
                </div>
              ))
            )}
          </section>
        )}

        {/* السائقون */}
        {tab === "drivers" && (
          <section style={css.card}>
            <h3>قائمة السائقين المسجلين</h3>

            {isAdmin && (
              <form onSubmit={addDriver}>
                <label>الاسم الشخصي</label>

                <input
                  style={css.input}
                  placeholder="الاسم الشخصي"
                  value={newDriverFirst}
                  onChange={e => setNewDriverFirst(e.target.value)}
                  required
                />

                <label>النسب</label>

                <input
                  style={css.input}
                  placeholder="النسب"
                  value={newDriverLast}
                  onChange={e => setNewDriverLast(e.target.value)}
                  required
                />

                <label>Matricule</label>

                <input
                  style={css.input}
                  placeholder="Matricule"
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

                {d.active === false ? "معطل" : "نشط"}

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

        {/* السيارات */}
        {tab === "vehicles" && (
          <section style={css.card}>
            <h3>قائمة السيارات المسجلة</h3>

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

                <label>نوع السيارة</label>

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
                {" — "}
                {v.active === false ? "معطلة" : "نشطة"}

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
