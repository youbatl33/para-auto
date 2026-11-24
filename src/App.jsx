
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const APP_NAME = "GIGR FLEET";
const APP_SUBTITLE = "GESTION DU PARC AUTOMOBILE";

const css = {
  page: {
    minHeight: "100vh",
    background: "#080b12",
    direction: "rtl",
    fontFamily: "Arial, sans-serif",
    color: "#f1f5f9"
  },
  header: {
    background: "linear-gradient(135deg,#02040a,#101b2d)",
    color: "white",
    padding: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    borderBottom: "3px solid #087cff",
    boxShadow: "0 4px 20px #006eff22"
  },
  container: {
    maxWidth: 1150,
    margin: "auto",
    padding: 16
  },
  card: {
    background: "#111827",
    border: "1px solid #26364d",
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
    boxShadow: "0 4px 16px #0006",
    color: "#e5e7eb"
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    background: "#080f1b",
    color: "#ffffff",
    border: "1px solid #334967",
    borderRadius: 8,
    marginTop: 7,
    marginBottom: 14,
    outlineColor: "#087cff"
  },
  button: {
    padding: "11px 16px",
    background: "linear-gradient(135deg,#087cff,#0054c7)",
    color: "white",
    border: "1px solid #168cff",
    borderRadius: 8,
    cursor: "pointer",
    margin: 3,
    fontWeight: "bold",
    boxShadow: "0 3px 10px #006eff33"
  },
  secondary: {
    padding: "10px 14px",
    background: "#1b293c",
    color: "#dbeafe",
    border: "1px solid #345477",
    borderRadius: 8,
    cursor: "pointer",
    margin: 3
  },
  danger: {
    padding: "9px 13px",
    background: "#991b1b",
    color: "white",
    border: "1px solid #ef4444",
    borderRadius: 8,
    cursor: "pointer",
    margin: 3
  }
};

// شعار GIGR FLEET بالأسود والأزرق
function GigrLogo({ compact = false }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      direction: "ltr"
    }}>
      <div style={{
        width: compact ? 58 : 78,
        height: compact ? 64 : 84,
        background: "linear-gradient(145deg,#111827,#020408)",
        border: "2px solid #087cff",
        clipPath: "polygon(50% 0%,94% 15%,88% 68%,50% 100%,12% 68%,6% 15%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 0 18px #087cff55"
      }}>
        <svg viewBox="0 0 100 110" width="90%" height="90%">
          <path
            d="M50 5 L91 20 L85 70 L50 103 L15 70 L9 20 Z"
            fill="none"
            stroke="#168cff"
            strokeWidth="3"
          />

          <path
            d="M50 15 L55 26 L68 28 L59 37 L61 49 L50 43 L39 49 L41 37 L32 28 L45 26 Z"
            fill="#168cff"
          />

          <path
            d="M17 65 L24 49 Q27 43 35 43 H65 Q73 43 76 49 L83 65 V76 H17 Z"
            fill="#087cff"
            stroke="#ffffff"
            strokeWidth="1.5"
          />

          <path
            d="M30 48 H70 L76 62 H24 Z"
            fill="#07111f"
            stroke="#64b5ff"
            strokeWidth="1.5"
          />

          <path
            d="M50 49 V62"
            stroke="#168cff"
            strokeWidth="2"
          />

          <circle cx="32" cy="76" r="7" fill="#020408" stroke="#168cff" strokeWidth="2.5"/>
          <circle cx="68" cy="76" r="7" fill="#020408" stroke="#168cff" strokeWidth="2.5"/>

          <text
            x="50"
            y="96"
            textAnchor="middle"
            fontSize="13"
            fontWeight="bold"
            fill="#ffffff"
            letterSpacing="1"
          >
            GIGR
          </text>
        </svg>
      </div>

      <div style={{ textAlign: "left" }}>
        <div style={{
          fontSize: compact ? 22 : 30,
          fontWeight: 900,
          letterSpacing: 3,
          color: "#ffffff",
          textShadow: "0 0 12px #087cff66"
        }}>
          GIGR
        </div>

        <div style={{
          fontSize: compact ? 15 : 19,
          color: "#168cff",
          letterSpacing: 5,
          fontWeight: 900
        }}>
          FLEET
        </div>

        <div style={{
          fontSize: compact ? 8 : 10,
          color: "#a9bdd8",
          letterSpacing: 1,
          fontWeight: "bold",
          marginTop: 4
        }}>
          INTERVENTION RAPIDE
        </div>
      </div>
    </div>
  );
}

// تحميل جميع السجلات
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

  const [newTripCode, setNewTripCode] = useState("");
  const [returnCodeInput, setReturnCodeInput] = useState("");
  const [returnKmInput, setReturnKmInput] = useState("");

  const isAdmin =
    profile?.role === "admin" && profile?.active !== false;

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
    return drivers.find(
      d => String(d.id) === String(id)
    )?.full_name || "غير محدد";
  }

  function driverMatricule(id) {
    return drivers.find(
      d => String(d.id) === String(id)
    )?.matricule || "غير مسجل";
  }

  function vehicleName(id) {
    const v = vehicles.find(
      x => String(x.id) === String(id)
    );

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

  // مراقبة تسجيل الدخول
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

  // تحميل البيانات
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
    if (!isAdmin) {
      return setMessage("التعديل خاص بالمراقب الرئيسي.");
    }

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

    try {
      const { error } = await supabase
        .from("drivers")
        .update({
          full_name: name.trim(),
          matricule: matricule.trim()
        })
        .eq("id", driver.id);

      if (error) throw error;

      setMessage("تم تعديل معلومات السائق.");
      await loadData();
    } catch (e) {
      setMessage("تعذر التعديل: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  // تعديل سيارة
  async function editVehicle(vehicle) {
    if (!isAdmin) {
      return setMessage("التعديل خاص بالمراقب الرئيسي.");
    }

    const plate = window.prompt("رقم التسجيل:", vehicle.plate);
    if (plate === null || !plate.trim()) return;

    const label = window.prompt("نوع السيارة:", vehicle.label);
    if (label === null || !label.trim()) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("vehicles")
        .update({
          plate: plate.trim(),
          label: label.trim()
        })
        .eq("id", vehicle.id);

      if (error) throw error;

      setMessage("تم تعديل السيارة.");
      await loadData();
    } catch (e) {
      setMessage("تعذر التعديل: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  // تعطيل سائق
  async function deactivateDriver(driver) {
    if (!isAdmin) {
      return setMessage("التعطيل خاص بالمراقب الرئيسي.");
    }

    if (
      openTrips.some(
        t => String(t.driver_id) === String(driver.id)
      )
    ) {
      return setMessage("لا يمكن تعطيل سائق لديه رحلة مفتوحة.");
    }

    if (!window.confirm("هل تريد تعطيل هذا السائق؟")) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("drivers")
        .update({ active: false })
        .eq("id", driver.id);

      if (error) throw error;

      setMessage("تم تعطيل السائق.");
      await loadData();
    } catch (e) {
      setMessage("تعذر تعطيل السائق: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  // تعطيل سيارة
  async function deactivateVehicle(vehicle) {
    if (!isAdmin) {
      return setMessage("التعطيل خاص بالمراقب الرئيسي.");
    }

    if (
      openTrips.some(
        t => String(t.vehicle_id) === String(vehicle.id)
      )
    ) {
      return setMessage("لا يمكن تعطيل سيارة لديها رحلة مفتوحة.");
    }

    if (!window.confirm("هل تريد تعطيل هذه السيارة؟")) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ active: false })
        .eq("id", vehicle.id);

      if (error) throw error;

      setMessage("تم تعطيل السيارة.");
      await loadData();
    } catch (e) {
      setMessage("تعذر تعطيل السيارة: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  // حذف سائق نهائياً
  async function deleteDriver(driver) {
    if (!isAdmin) {
      return setMessage("الحذف خاص بالمراقب الرئيسي فقط.");
    }

    if (!window.confirm(
      `هل أنت متأكد من حذف السائق "${driver.full_name}" نهائياً؟\n\nيجب أن تكون علاقة الرحلات بالسائق مضبوطة على ON DELETE SET NULL حتى تبقى الرحلات محفوظة.`
    )) return;

    setSaving(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("drivers")
        .delete()
        .eq("id", driver.id)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("لم يتم الحذف. تحقق من صلاحيات المراقب.");
      }

      setMessage("تم حذف السائق نهائياً.");
      await loadData();
    } catch (e) {
      setMessage("تعذر حذف السائق: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  // حذف السيارة مع الاحتفاظ بالرحلات
  async function deleteVehicle(vehicle) {
    if (!isAdmin) {
      return setMessage("الحذف خاص بالمراقب الرئيسي فقط.");
    }

    if (!window.confirm(
      `هل أنت متأكد من حذف السيارة "${vehicle.plate} - ${vehicle.label}" نهائياً؟\n\nمعلومات الرحلات السابقة ستبقى محفوظة في سجل الرحلات.`
    )) return;

    setSaving(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicle.id)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("لم يتم الحذف. تحقق من صلاحيات المراقب.");
      }

      setMessage(
        "تم حذف السيارة بنجاح. جميع الرحلات السابقة بقيت محفوظة في السجل."
      );

      await loadData();
    } catch (e) {
      setMessage("تعذر حذف السيارة: " + e.message);
    } finally {
      setSaving(false);
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

  // تعديل الرحلة للمراقب الرئيسي
  async function editTrip(trip) {
    if (!isAdmin) {
      return setMessage("تعديل الرحلات خاص بالمراقب الرئيسي فقط.");
    }

    const driverNameValue = window.prompt(
      "اسم السائق:",
      trip.driver_name || ""
    );
    if (driverNameValue === null || !driverNameValue.trim()) return;

    const matriculeValue = window.prompt(
      "Matricule السائق:",
      trip.driver_matricule || ""
    );
    if (matriculeValue === null) return;

    const vehicleValue = window.prompt(
      "السيارة ورقم التسجيل:",
      trip.vehicle_name || ""
    );
    if (vehicleValue === null || !vehicleValue.trim()) return;

    const destinationValue = window.prompt(
      "الوجهة:",
      trip.destination || ""
    );
    if (destinationValue === null || !destinationValue.trim()) return;

    const purposeValue = window.prompt(
      "الغرض من الرحلة:",
      trip.purpose || ""
    );
    if (purposeValue === null) return;

    const departureKmValue = window.prompt(
      "عداد الانطلاق KM:",
      String(trip.departure_km ?? "")
    );
    if (departureKmValue === null) return;

    const departureKm = Number(departureKmValue);

    if (
      departureKmValue.trim() === "" ||
      !Number.isInteger(departureKm) ||
      departureKm < 0
    ) {
      return setMessage("عداد الانطلاق غير صحيح.");
    }

    let returnKmValue = trip.return_km;

    if (trip.return_km !== null && trip.return_km !== undefined) {
      const value = window.prompt(
        "عداد العودة KM:",
        String(trip.return_km)
      );

      if (value === null) return;

      returnKmValue = Number(value);

      if (
        value.trim() === "" ||
        !Number.isInteger(returnKmValue) ||
        returnKmValue < departureKm
      ) {
        return setMessage(
          "عداد العودة يجب أن يكون أكبر من أو يساوي عداد الانطلاق."
        );
      }
    }

    const notesValue = window.prompt(
      "ملاحظات:",
      trip.notes || ""
    );
    if (notesValue === null) return;

    if (!window.confirm("هل تريد حفظ تعديلات هذه الرحلة؟")) return;

    setSaving(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("trips")
        .update({
          driver_name: driverNameValue.trim(),
          driver_matricule: matriculeValue.trim(),
          vehicle_name: vehicleValue.trim(),
          destination: destinationValue.trim(),
          purpose: purposeValue.trim() || null,
          departure_km: departureKm,
          return_km: returnKmValue,
          notes: notesValue.trim() || null
        })
        .eq("id", trip.id)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("لم يتم تعديل الرحلة. تحقق من صلاحيات المراقب.");
      }

      setMessage("تم تعديل الرحلة بنجاح.");
      await loadData();
    } catch (e) {
      setMessage("تعذر تعديل الرحلة: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  // تسجيل العودة بدون حساب
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

  // الفوتر
  const footer = (
    <div style={{
      textAlign: "center",
      padding: 20,
      color: "#8ba3c2",
      fontWeight: "bold"
    }}>
      {APP_NAME} © 2026
      <div style={{
        fontSize: 11,
        marginTop: 5,
        letterSpacing: 1,
        color: "#168cff"
      }}>
        {APP_SUBTITLE}
      </div>
    </div>
  );

  // شاشة التحميل
  if (loading) {
    return (
      <div style={{
        ...css.page,
        padding: 40,
        textAlign: "center"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 20
        }}>
          <GigrLogo />
        </div>
        جاري تحميل GIGR FLEET...
      </div>
    );
  }

  // صفحة المستخدم بدون تسجيل الدخول
  if (!user) {
    return (
      <div style={css.page}>
        <header style={css.header}>
          <div>
            <GigrLogo />
            <div style={{ marginTop: 8, fontSize: 13, color: "#a9bdd8" }}>
              نظام تدبير السيارات والرحلات
            </div>
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
              borderRight: "5px solid #087cff"
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

          {newTripCode && (
            <section style={{
              ...css.card,
              border: "2px solid #087cff",
              textAlign: "center"
            }}>
              <h3>✅ تم تسجيل الرحلة بنجاح</h3>
              <p>
                احتفظ بهذا الرمز السري، ستحتاج إليه عند عودة السيارة:
              </p>

              <h2 style={{
                direction: "ltr",
                letterSpacing: 3,
                color: "#168cff",
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

          {footer}
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
          <GigrLogo />
          <div style={{ marginTop: 8, fontSize: 13, color: "#a9bdd8" }}>
            نظام تدبير السيارات والرحلات
          </div>
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
            borderRight: "5px solid #087cff"
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
            <div key={label} style={{
              ...css.card,
              borderTop: "3px solid #087cff"
            }}>
              <div style={{ color: "#a9bdd8" }}>{label}</div>
              <h2 style={{ marginBottom: 0, color: "#168cff" }}>{value}</h2>
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
                border: "2px solid #087cff",
                borderRadius: 10,
                padding: 15,
                marginTop: 15,
                textAlign: "center",
                background: "#080f1b"
              }}>
                <h3>رمز العودة الخاص بالرحلة</h3>
                <h2 style={{
                  direction: "ltr",
                  color: "#168cff",
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
              <h3 style={{ color: "#168cff" }}>🚗 الرحلات المفتوحة</h3>

              {openTrips.length === 0 && (
                <p>لا توجد رحلات مفتوحة.</p>
              )}

              {openTrips.map(t => (
                <div key={t.id} style={{
                  borderBottom: "1px solid #26364d",
                  padding: "14px 0"
                }}>
                  <b style={{ color: "#ffffff" }}>{t.destination}</b>

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

                  {isAdmin && (
                    <button
                      style={css.secondary}
                      disabled={saving}
                      onClick={() => editTrip(t)}
                    >
                      ✏️ تعديل الرحلة
                    </button>
                  )}
                </div>
              ))}
            </section>

            <section style={css.card}>
              <h3 style={{ color: "#168cff" }}>✅ الرحلات المكتملة</h3>

              {completedTrips.length === 0 && (
                <p>لا توجد رحلات مكتملة.</p>
              )}

              {completedTrips.map(t => (
                <div key={t.id} style={{
                  borderBottom: "1px solid #26364d",
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

                  {isAdmin && (
                    <button
                      style={css.secondary}
                      disabled={saving}
                      onClick={() => editTrip(t)}
                    >
                      ✏️ تعديل الرحلة
                    </button>
                  )}
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
                  borderBottom: "1px solid #334155",
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

                  {isAdmin && (
                    <div className="no-print">
                      <button
                        style={css.button}
                        onClick={() => editTrip(t)}
                        disabled={saving}
                      >
                        ✏️ تعديل الرحلة
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        )}

        {/* السائقون */}
        {tab === "drivers" && (
          <section style={css.card}>
            <h3 style={{ color: "#168cff" }}>قائمة السائقين المسجلين</h3>

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
                borderBottom: "1px solid #26364d"
              }}>
                <b>{d.full_name}</b>
                <p>Matricule: {d.matricule || "غير مسجل"}</p>

                {d.active === false ? "معطل" : "نشط"}

                {isAdmin && (
                  <>
                    <button
                      style={css.secondary}
                      onClick={() => editDriver(d)}
                      disabled={saving}
                    >
                      تعديل
                    </button>

                    {d.active !== false && (
                      <button
                        style={css.danger}
                        onClick={() => deactivateDriver(d)}
                        disabled={saving}
                      >
                        تعطيل
                      </button>
                    )}

                    <button
                      style={css.danger}
                      onClick={() => deleteDriver(d)}
                      disabled={saving}
                    >
                      حذف نهائي
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
            <h3 style={{ color: "#168cff" }}>قائمة السيارات المسجلة</h3>

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
                borderBottom: "1px solid #26364d"
              }}>
                <b>{v.plate} - {v.label}</b>
                {" — "}
                {v.active === false ? "معطلة" : "نشطة"}

                {isAdmin && (
                  <>
                    <button
                      style={css.secondary}
                      onClick={() => editVehicle(v)}
                      disabled={saving}
                    >
                      تعديل
                    </button>

                    {v.active !== false && (
                      <button
                        style={css.danger}
                        onClick={() => deactivateVehicle(v)}
                        disabled={saving}
                      >
                        تعطيل
                      </button>
                    )}

                    <button
                      style={css.danger}
                      onClick={() => deleteVehicle(v)}
                      disabled={saving}
                    >
                      حذف نهائي
                    </button>
                  </>
                )}
              </div>
            ))}
          </section>
        )}

        {footer}

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
