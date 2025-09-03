"use client";
import { FaRegCreditCard } from "react-icons/fa";
import { RiBankFill } from "react-icons/ri";
import { TiDeviceDesktop } from "react-icons/ti";
import { FaUser } from "react-icons/fa6";
import { FaCalendarAlt } from "react-icons/fa";
import { FaLink } from "react-icons/fa";
import { HiBuildingOffice } from "react-icons/hi2";
import { VscSettings } from "react-icons/vsc";
import { useState, useMemo, ChangeEvent, FormEvent, useEffect } from "react";

const HRIS_API = process.env.NEXT_PUBLIC_HRIS_API_URL || "";
const HRIS_TOKEN = process.env.NEXT_PUBLIC_HRIS_BARRIER_TOKEN || "";

type Employee = {
  id: number;
  name: string;
  branch: string;
  department: string;
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [priceDisplay, setPriceDisplay] = useState("");
  const [priceRaw, setPriceRaw] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    branch: "",
    department: "",
    equipmentName: "",
    onlineStoreLink: "",
    bankName: "",
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
  const uniqueBranches = useMemo(() =>
    Array.from(new Set(employees.map(emp => emp.branch))).filter(Boolean), [employees]);

  // Autocomplete for Department
  const [showDeptSuggestions, setShowDeptSuggestions] = useState(false);
  const [filteredDepts, setFilteredDepts] = useState<string[]>([]);
  const uniqueDepts = useMemo(() =>
    Array.from(new Set(employees.map(emp => emp.department))).filter(Boolean), [employees]);

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
      bankAccountNumber: "",
      bankAccountName: "",
      dateNeeded: "",
      details: "",
    });
    setPriceDisplay("");
    setPriceRaw(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const submissionData = {
      ...formData,
      price: priceRaw,
    };

    console.log("Submitting to API:", submissionData);

    try {
      const response = await fetch("/api/equipment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        alert("Request submitted successfully!");
        resetForm();
      } else {
        const errorData = await response.json();
        alert(
          `Submission failed: ${
            errorData.message || errorData.error || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("An error occurred during submission:", error);
      alert("An error occurred. Please check the console and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // connect and fetch employees dari HRIS API
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const res = await fetch(`${HRIS_API}/employee`, {
          headers: {
            Authorization: `Bearer ${HRIS_TOKEN}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch employees");
        const data = await res.json();
        setEmployees(data?.data || []);
      } catch (err) {
        console.error("Error fetching employees:", err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    if (HRIS_API && HRIS_TOKEN) {
      fetchEmployees();
    }
  }, []);

  // Autocomplete handler for Full Name
  const handleFullNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, fullName: value }));
    if (value.length > 0) {
      const filtered = employees.filter((emp) =>
        emp.name.toLowerCase().startsWith(value.toLowerCase())
      );
      setFilteredEmployees(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredEmployees([]);
      setShowSuggestions(false);
    }
  };

  // When user clicks a suggestion
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
      const filtered = uniqueBranches.filter(branch =>
        branch.toLowerCase().startsWith(value.toLowerCase())
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
      const filtered = uniqueDepts.filter(dept =>
        dept.toLowerCase().startsWith(value.toLowerCase())
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
      <div className="w-full max-w-2xl bg-white rounded-md shadow-lg my-8">
        <form onSubmit={handleSubmit} className="flex flex-col mx-13">
          <h1 className="text-center text-3xl font-bold text-black pt-11">
            Equipment Payment Request
          </h1>
          <p className="text-center text-md text-gray-600 pt-2">
            Please fill out the form below to request a new equipment purchase.
          </p>

          {/* Full Name & Branch */}
          <div className="flex flex-col lg:flex-row justify-center items-start gap-x-8 w-full">
            {/* Full Name Autocomplete */}
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
                    if (formData.fullName && filteredEmployees.length > 0) setShowSuggestions(true);
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
                    if (formData.branch && filteredBranches.length > 0) setShowBranchSuggestions(true);
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
                    if (formData.department && filteredDepts.length > 0) setShowDeptSuggestions(true);
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
                        onMouseDown={() => handleDeptSuggestionClick(dept)}
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
                placeholder="https://example.com/product/123"
              />
            </div>
          </div>

          {/* Bank Name & Account */}
          <div className="flex flex-col lg:flex-row justify-center text-start gap-x-8">
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
                  <option value="" disabled>
                    -- Select Bank Name --
                  </option>
                  <option value="BCA">BCA</option>
                  <option value="Mandiri">Bank Mandiri</option>
                  <option value="BRI">Bank Rakyat Indonesia</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col w-full">
              <p className="text-black pt-8">Bank Account Number</p>
              <div className="relative">
                <FaRegCreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  name="bankAccountNumber"
                  type="text"
                  required
                  value={formData.bankAccountNumber}
                  onChange={handleChange}
                  className="w-full pl-10 py-2 border border-gray-300 rounded-md"
                  placeholder="1234567890"
                />
              </div>
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
              value={formData.details}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2"
              placeholder="Please provide any specific details..."
            />
          </div>

          <div className="flex justify-center pt-8 pb-10">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-800 hover:scale-105 text-white py-3 px-8 rounded-lg transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}