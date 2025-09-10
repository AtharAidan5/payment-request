"use client";
import { FaRegCreditCard } from "react-icons/fa";
import { RiBankFill } from "react-icons/ri";
import { TiDeviceDesktop } from "react-icons/ti";
import { FaUser } from "react-icons/fa6";
import { FaCalendarAlt } from "react-icons/fa";
import { FaLink } from "react-icons/fa";
import { HiBuildingOffice } from "react-icons/hi2";
import { VscSettings } from "react-icons/vsc";
import { useState, useMemo, ChangeEvent, FormEvent, useEffect, useRef } from "react";
import { fetchEmployees } from "@/lib/hris-api";
import { usePayment } from "@/hooks/use-payment";
import type { EquipmentPaymentPayload } from "@/hooks/use-payment";

/* -------------------- Notification Modal (no extra libs) -------------------- */
type NotifState = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message: string;
};
const AUTO_DISMISS_MS = 2000;

function NotificationModal({
  open,
  type,
  title,
  message,
  onClose,
}: NotifState & { onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  // Focus the primary button when opened (basic a11y)
  useEffect(() => {
    if (open) {
      primaryBtnRef.current?.focus();
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Auto dismiss (feel free to remove if you want sticky modal)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  const isSuccess = type === "success";

  const Icon = isSuccess ? (
    <svg className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.172 7.707 8.879A1 1 0 106.293 10.293l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="h-6 w-6 text-red-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.293 7.293a1 1 0 011.414 0L10 7.586l.293-.293a1 1 0 111.414 1.414L11.414 9l.293.293a1 1 0 01-1.414 1.414L10 10.414l-.293.293a1 1 0 01-1.414-1.414L8.586 9l-.293-.293a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );

  const border = isSuccess ? "border-green-500" : "border-red-500";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] bg-black/40 flex items-center justify-center p-4"
      onClick={(e) => {
        // close when clicking the backdrop only
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className={`w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-black/5 border-l-4 ${border}`}
      >
        <div className="px-6 py-5">
          <div className="flex items-start gap-3">
            {Icon}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <p className="mt-1 text-sm text-gray-600">{message}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* -------------------------------------------------------------------------- */

type Employee = {
  id: number;
  name: string;
  branch: string;
  department: string;
};

const toAmountString = (n: number | null) => {
  const v = typeof n === "number" && !Number.isNaN(n) ? n : 0;
  return v.toFixed(2);
};

// util: "YYYY-MM-DD" → "DD/MM/YY"
const toDDMMYY = (val: string) => {
  if (!val) return "";
  const [yyyy, mm, dd] = val.split("-");
  if (!yyyy || !mm || !dd) return "";
  const yy = yyyy.slice(-2);
  return `${dd}/${mm}/${yy}`;
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [priceDisplay, setPriceDisplay] = useState("");
  const [priceRaw, setPriceRaw] = useState<number | null>(null);

  // 🔔 Notification state
  const [notif, setNotif] = useState<NotifState>({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  const [formData, setFormData] = useState({
    fullName: "",
    branch: "",
    department: "",
    equipmentName: "",
    onlineStoreLink: "",
    bankName: "",
    bankBranch: "",
    bankAccountNumber: "",
    bankAccountName: "",
    dateNeeded: "",
    details: "",
  });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);

  // Autocomplete for Branch
  const [showBranchSuggestions, setShowBranchSuggestions] = useState(false);
  const [filteredBranches, setFilteredBranches] = useState<string[]>([]);
  const uniqueBranches = useMemo(
    () => Array.from(new Set(employees.map((emp) => emp.branch))).filter(Boolean),
    [employees]
  );

  // Autocomplete for Department
  const [showDeptSuggestions, setShowDeptSuggestions] = useState(false);
  const [filteredDepts, setFilteredDepts] = useState<string[]>([]);
  const uniqueDepts = useMemo(
    () => Array.from(new Set(employees.map((emp) => emp.department))).filter(Boolean),
    [employees]
  );

  // Formatter IDR display
  const idFormatter = useMemo(() => new Intl.NumberFormat("id-ID"), []);
  const formatIDR = (digits: string) =>
    digits ? idFormatter.format(parseInt(digits, 10)) : "";

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setPriceDisplay(formatIDR(digits));
    setPriceRaw(digits ? parseInt(digits, 10) : null);
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      branch: "",
      department: "",
      equipmentName: "",
      onlineStoreLink: "",
      bankName: "",
      bankBranch: "",
      bankAccountNumber: "",
      bankAccountName: "",
      dateNeeded: "",
      details: "",
    });
    setPriceDisplay("");
    setPriceRaw(null);
  };

  // Hook Payment (POST)
  const {
    isPosting,
    error: postError,
    createPayment,
    reset: resetPayment,
  } = usePayment({
    baseURL: process.env.NEXT_PUBLIC_PAYMENT_API_URL,     // https://equipment-api.vercel.app/api/v1/
    token: process.env.NEXT_PUBLIC_PAYMENT_BARRIER_TOKEN, // 001122
    endpoint: "request-payment",                          // without /api/v1 again
  });

  // GET employees via fetchEmployees()
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingEmployees(true);
      try {
        const json = await fetchEmployees();
        const list = Array.isArray(json) ? json : json?.data;
        if (isMounted && Array.isArray(list)) {
          const normalized: Employee[] = list.map((item: Record<string, unknown>) => ({
            id: Number((item["id"] ?? item["employeeId"] ?? item["ID"]) ?? 0),
            name: String((item["name"] ?? item["fullname"] ?? item["fullName"]) ?? ""),
            branch: String((item["branch"] ?? item["Branch"]) ?? ""),
            department: String((item["department"] ?? item["Department"]) ?? ""),
          }));
          setEmployees(normalized);
        } else if (isMounted) {
          console.warn("Unexpected employees payload shape:", json);
          setEmployees([]);
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
        if (isMounted) setEmployees([]);
      } finally {
        if (isMounted) setLoadingEmployees(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Submit → mapping payload sesuai backend
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const apiPayload = {
      fullname: formData.fullName,
      branch: formData.branch,
      department: formData.department,
      equipmentName: formData.equipmentName,
      link: formData.onlineStoreLink,
      bankName: formData.bankName,
      bankBranch: formData.bankBranch,
      bankAccountNumber: formData.bankAccountNumber,
      amount: toAmountString(priceRaw),        // "123.00"
      date: toDDMMYY(formData.dateNeeded),     // "DD/MM/YY"
      detail: formData.details,
    };

    try {
      console.log("[PAYMENT] Payload:", apiPayload);

      const result = await createPayment(apiPayload as unknown as EquipmentPaymentPayload);
      console.log("[PAYMENT] Result:", result);

      resetForm();
      resetPayment();

      // ✅ Show success modal on the same page
      setNotif({
        open: true,
        type: "success",
        title: "Submission Received 🎉",
        message: "Your equipment payment request has been submitted successfully.",
      });
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : (postError || "Unknown error");
      // ❌ Show error modal on the same page
      setNotif({
        open: true,
        type: "error",
        title: "Submission Failed",
        message: `We couldn't submit your request. ${message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Autocomplete handler for Full Name
  const handleFullNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, fullName: value }));
    if (value.length > 0) {
      const v = value.toLowerCase();
      const filtered = employees.filter((emp) =>
        (emp.name || "").toLowerCase().startsWith(v)
      );
      setFilteredEmployees(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredEmployees([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (emp: Employee) => {
    setFormData((prev) => ({
      ...prev,
      fullName: emp.name,
      branch: emp.branch,
      department: emp.department,
    }));
    setShowSuggestions(false);
  };

  // Autocomplete for Branch
  const handleBranchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, branch: value }));
    if (value.length > 0) {
      const v = value.toLowerCase();
      const filtered = uniqueBranches.filter((branch) =>
        (branch || "").toLowerCase().startsWith(v)
      );
      setFilteredBranches(filtered);
      setShowBranchSuggestions(true);
    } else {
      setFilteredBranches([]);
      setShowBranchSuggestions(false);
    }
  };
  const handleBranchSuggestionClick = (branch: string) => {
    setFormData((prev) => ({ ...prev, branch }));
    setShowBranchSuggestions(false);
  };

  // Autocomplete for Department
  const handleDeptChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, department: value }));
    if (value.length > 0) {
      const v = value.toLowerCase();
      const filtered = uniqueDepts.filter((dept) =>
        (dept || "").toLowerCase().startsWith(v)
      );
      setFilteredDepts(filtered);
      setShowDeptSuggestions(true);
    } else {
      setFilteredDepts([]);
      setShowDeptSuggestions(false);
    }
  };
  const handleDeptSuggestionClick = (department: string) => {
    setFormData((prev) => ({ ...prev, department }));
    setShowDeptSuggestions(false);
  };

  return (
    <main className="flex flex-col items-center justify-center mx-auto px-4 min-h-screen">
      {/* 🔔 Modal lives here */}
      <NotificationModal
        open={notif.open}
        type={notif.type}
        title={notif.title}
        message={notif.message}
        onClose={() => setNotif((s) => ({ ...s, open: false }))}
      />

      <div className="w-full max-w-2xl bg-white rounded-md shadow-lg my-8">
        <form onSubmit={handleSubmit} className="flex flex-col mx-7 lg:mx-13">
          <h1 className="text-center text-3xl font-bold text-black pt-11">
            Equipment Payment Request
          </h1>
          <p className="text-center text-md text-gray-600 pt-2">
            Please fill out the form below to request a new equipment purchase.
          </p>

          {/* Full Name & Branch */}
          <div className="flex flex-col lg:flex-row justify-center items-start gap-x-8 w-full">
            {/* Full Name */}
            <div className="flex flex-col w-full">
              <p className="text-black pt-8">Full Name</p>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  name="fullName"
                  required
                  autoComplete="off"
                  value={formData.fullName}
                  onChange={handleFullNameChange}
                  onFocus={() => {
                    if (formData.fullName && filteredEmployees.length > 0)
                      setShowSuggestions(true);
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
                  className="w-full pl-10 py-2 border border-gray-300 rounded-md"
                  placeholder={loadingEmployees ? "Loading employees..." : "Type employee name"}
                />
                {showSuggestions && filteredEmployees.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                    {filteredEmployees.map((emp) => (
                      <li
                        key={emp.id}
                        className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                        onMouseDown={() => handleSuggestionClick(emp)}
                      >
                        {emp.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Branch */}
            <div className="flex flex-col w-full">
              <label className="text-black pt-8">Branch</label>
              <div className="relative">
                <HiBuildingOffice className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  name="branch"
                  type="text"
                  required
                  autoComplete="off"
                  value={formData.branch}
                  onChange={handleBranchChange}
                  onFocus={() => {
                    if (formData.branch && filteredBranches.length > 0)
                      setShowBranchSuggestions(true);
                  }}
                  onBlur={() => setTimeout(() => setShowBranchSuggestions(false), 100)}
                  className="w-full pl-10 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g. Cretivox"
                />
                {showBranchSuggestions && filteredBranches.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                    {filteredBranches.map((branch) => (
                      <li
                        key={branch}
                        className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                        onMouseDown={() => handleBranchSuggestionClick(branch)}
                      >
                        {branch}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row justify-center text-start gap-x-8">
            {/* Department */}
            <div className="flex flex-col w-full">
              <label className="text-black pt-8">Department</label>
              <div className="relative">
                <VscSettings className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  name="department"
                  type="text"
                  required
                  autoComplete="off"
                  value={formData.department}
                  onChange={handleDeptChange}
                  onFocus={() => {
                    if (formData.department && filteredDepts.length > 0)
                      setShowDeptSuggestions(true);
                  }}
                  onBlur={() => setTimeout(() => setShowDeptSuggestions(false), 100)}
                  className="w-full pl-10 py-2.5 border border-gray-300 rounded-md"
                  placeholder="e.g. IT"
                />
                {showDeptSuggestions && filteredDepts.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                    {filteredDepts.map((dept) => (
                      <li
                        key={dept}
                        className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                        onMouseDown={() => setFormData((p) => ({ ...p, department: dept }))}
                      >
                        {dept}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Equipment */}
            <div className="flex flex-col w-full">
              <p className="text-black pt-8">Equipment Name</p>
              <div className="relative">
                <TiDeviceDesktop className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  name="equipmentName"
                  type="text"
                  required
                  value={formData.equipmentName}
                  onChange={handleChange}
                  className="w-full pl-10 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g. Laptop, Camera, etc."
                />
              </div>
            </div>
          </div>

          {/* Online Store Link */}
          <div className="flex flex-col">
            <p className="text-black pt-8">Link to Online Store</p>
            <div className="relative">
              <FaLink className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                name="onlineStoreLink"
                type="url"
                required
                value={formData.onlineStoreLink}
                onChange={handleChange}
                className="w-full pl-10 py-2 border border-gray-300 rounded-md"
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* Bank Name & Bank Branch */}
          <div className="flex flex-col lg:flex-row justify-center text-start gap-x-8">
            {/* Bank Name */}
            <div className="flex flex-col w-full">
              <p className="text-black pt-8">Bank Name</p>
              <div className="relative">
                <RiBankFill className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  name="bankName"
                  required
                  value={formData.bankName}
                  onChange={handleChange}
                  className="w-full pl-10 py-2.5 border border-gray-300 rounded-md"
                >
                  <option value="" disabled>-- Select Bank Name --</option>
                  <option value="BCA">BCA</option>
                  <option value="Mandiri">Bank Mandiri</option>
                  <option value="BRI">Bank Rakyat Indonesia</option>
                  <option value="BNI">Bank Negara Indonesia</option>
                  <option value="CIMB Niaga">CIMB Niaga</option>
                  <option value="Permata">Bank Permata</option>
                  <option value="Danamon">Bank Danamon</option>
                  <option value="OCBC NISP">OCBC NISP</option>
                  <option value="UOB">UOB</option>
                  <option value="Panin">Bank Panin</option>
                  <option value="Commonwealth">Bank Commonwealth</option>
                  <option value="Mega">Bank Mega</option>
                  <option value="Sinarmas">Bank Sinarmas</option>
                  <option value="BTN">Bank Tabungan Negara</option>
                  <option value="Jenius">Jenius (BTPN)</option>
                  <option value="Lainnya">Lainnya / Others</option>
                </select>
              </div>
            </div>

            {/* Bank Branch */}
            <div className="flex flex-col w-full">
              <p className="text-black pt-8">Bank Branch</p>
              <div className="relative">
                <RiBankFill className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  name="bankBranch"
                  type="text"
                  required
                  value={formData.bankBranch}
                  onChange={handleChange}
                  className="w-full pl-10 py-2.5 border border-gray-300 rounded-md"
                  placeholder="e.g. KCP UPM / Sudirman"
                />
              </div>
            </div>
          </div>

          {/* Bank Account Number */}
          <div className="flex flex-col w-full">
            <p className="text-black pt-8">Bank Account Number</p>
            <div className="relative">
              <FaRegCreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                name="bankAccountNumber"
                type="number"
                required
                value={formData.bankAccountNumber}
                onChange={handleChange}
                className="w-full pl-10 py-2 border border-gray-300 rounded-md"
                placeholder="1234567890"
              />
            </div>
          </div>

          {/* Bank Account Name */}
          <div className="flex flex-col w-full">
            <p className="text-black pt-8">Bank Account Name</p>
            <div className="relative">
              <RiBankFill className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                name="bankAccountName"
                type="text"
                required
                value={formData.bankAccountName}
                onChange={handleChange}
                className="w-full pl-10 py-2 border border-gray-300 rounded-md"
                placeholder="Syafi Athar Aidan"
              />
            </div>
          </div>

          {/* Price & Date */}
          <div className="flex flex-col lg:flex-row justify-center text-start gap-x-8">
            <div className="flex flex-col w-full">
              <label className="text-black pt-8">Price</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">Rp</span>
                </div>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  className="w-full pl-10 border border-gray-300 rounded-md p-2"
                  placeholder="1.000.000"
                  value={priceDisplay}
                  onChange={handlePriceChange}
                />
              </div>
            </div>

            <div className="flex flex-col w-full">
              <label className="text-black pt-8">Date Needed</label>
              <div className="relative">
                <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  name="dateNeeded"
                  type="date"
                  required
                  value={formData.dateNeeded}
                  onChange={handleChange}
                  className="w-full pl-10 border border-gray-300 rounded-md py-2"
                />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <label className="text-black pt-8">Details / Specifications</label>
            <textarea
              name="details"
              required
              value={formData.details}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2"
              placeholder="Please provide any specific details..."
            />
          </div>

          <div className="flex justify-center pt-8 pb-10">
            <button
              type="submit"
              disabled={isLoading || isPosting}
              className="bg-blue-600 hover:bg-blue-800 hover:scale-105 text-white py-3 px-8 rounded-lg transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading || isPosting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
