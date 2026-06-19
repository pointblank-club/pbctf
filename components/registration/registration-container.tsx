"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useRecaptcha } from "@/hooks/use-recaptcha";
import { useToast } from "@/hooks/use-toast";
import {
  LogIn,
  UserPlus,
  Zap,
  Info,
  ExternalLink,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Terminal,
  CircleCheck,
  CircleDot,
  Lock,
  User as UserIcon,
  FileText,
  Link as LinkIcon,
  ClipboardCheck,
  Pencil,
  AlertCircle,
} from "lucide-react";
import { FormInput } from "./form-input";
import { FormTextarea } from "./form-textarea";
import { FormSelect } from "./form-select";
import { FormFileUpload } from "./form-file-upload";
import { FormPhoneInput, isValidPhoneNumber } from "./form-phone-input";
import { FormSection } from "./form-section";
import { RecaptchaNotice } from "./recaptcha-notice";
import { Button } from "./button";
import { Card } from "./card";
import { StickyAlert } from "./sticky-alert";
import { Spinner } from "@/components/ui/spinner";
import { Modal } from "./modal";

import { HudFrame } from "./hud-frame";
// PRODUCTION MODE - Debug features disabled
const DEBUG_MODE = false;

// LocalStorage key for form data persistence
const REGISTRATION_FORM_STORAGE_KEY = "zenith_registration_form_data";

interface RegistrationContainerProps {
  onSuccess?: () => void;
}

type StepId = "account" | "identity" | "profile" | "links" | "review";

const STEPS: Array<{
  id: StepId;
  label: string;
  hint: string;
  icon: typeof Lock;
}> = [
  { id: "account", label: "Account", hint: "Credentials", icon: Lock },
  { id: "identity", label: "Identity", hint: "Who you are", icon: UserIcon },
  { id: "profile", label: "Profile", hint: "Bio & files", icon: FileText },
  { id: "links", label: "Links", hint: "Socials", icon: LinkIcon },
  { id: "review", label: "Review", hint: "Confirm & submit", icon: ClipboardCheck },
];

export function RegistrationContainer({
  onSuccess,
}: RegistrationContainerProps) {
  const router = useRouter();
  const { register } = useAuth();
  const { executeRecaptcha } = useRecaptcha();
  const { toast } = useToast();
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  // Helper function to get initial form data from localStorage
  const getInitialFormData = () => {
    try {
      const savedData = localStorage.getItem(REGISTRATION_FORM_STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.registerData) {
          // Merge with default values to ensure all fields exist
          return {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
            discord_username: "",
            phone: "",
            age: "",
            organisation: "",
            bio: "",
            github: "",
            linkedin: "",
            ctf: "",
            portfolio: "",
            ...parsed.registerData,
          };
        }
      }
    } catch (error) {
      console.error("Error reading form data from localStorage:", error);
    }
    // Return default empty values
    return {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      discord_username: "",
      phone: "",
      age: "",
      organisation: "",
      bio: "",
      github: "",
      linkedin: "",
      ctf: "",
      portfolio: "",
    };
  };

  // Registration form state - initialized from localStorage
  const [registerData, setRegisterData] = useState(getInitialFormData);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // File states. Files (and their displayed metadata) are intentionally NOT
  // persisted to localStorage — File objects can't be serialized, and showing
  // a stale filename when the underlying File ref is null misleads the user
  // into thinking the file is still attached on retry. Always start empty.
  const [resume, setResume] = useState<File | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [resumeFileName, setResumeFileName] = useState("");
  const [profilePhotoFileName, setProfilePhotoFileName] = useState("");

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCodeOfConductModalOpen, setIsCodeOfConductModalOpen] =
    useState(false);
  const [acceptedCodeOfConduct, setAcceptedCodeOfConduct] = useState(false);
  const [cocScrolledToBottom, setCocScrolledToBottom] = useState(false);
  const cocScrollRef = useRef<HTMLDivElement | null>(null);

  // Reset scroll + read state every time the CoC modal opens
  useEffect(() => {
    if (isCodeOfConductModalOpen) {
      setCocScrolledToBottom(false);
      // Defer to next paint so the dialog has mounted
      requestAnimationFrame(() => {
        if (cocScrollRef.current) cocScrollRef.current.scrollTop = 0;
      });
    }
  }, [isCodeOfConductModalOpen]);

  // Lock background scroll + close on Escape while CoC modal is open.
  // Without this the user can scroll the page behind the overlay (and
  // on iOS the modal can drift off-screen if it's portalled into a
  // transformed ancestor).
  useEffect(() => {
    if (!isCodeOfConductModalOpen) return;
    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsCodeOfConductModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isCodeOfConductModalOpen]);

  const handleCocScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    // 16px slack so the gate doesn't require pixel-perfect scrolling
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) {
      setCocScrolledToBottom(true);
    }
  };

  // Multi-step wizard state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Track if component has mounted to avoid saving empty data on initial mount
  const isInitialMount = useRef(true);

  // Key for file inputs to force reset when clearing
  const [fileInputKey, setFileInputKey] = useState(0);

  // Save form data to localStorage whenever it changes (excluding sensitive
  // password fields and file metadata — see comment on file state above).
  useEffect(() => {
    // Skip saving on initial mount since we just loaded from localStorage
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    try {
      // Exclude password fields from localStorage for security
      const { password, confirmPassword, ...safeRegisterData } = registerData;
      const dataToSave = {
        registerData: safeRegisterData,
      };
      localStorage.setItem(
        REGISTRATION_FORM_STORAGE_KEY,
        JSON.stringify(dataToSave),
      );
    } catch (error) {
      console.error("Error saving form data to localStorage:", error);
    }
  }, [registerData]);

  // DEBUG: Auto-fill function
  const handleAutoFill = () => {
    const randomId = Math.floor(Math.random() * 1000);
    setRegisterData({
      name: `Test User ${randomId}`,
      email: `testuser${randomId}@example.com`,
      password: "Password@123",
      confirmPassword: "Password@123",
      discord_username: "testuser.discord",
      phone: "+919876543210",
      age: "22",
      organisation: "Test University/Company",
      bio: "I'm a passionate developer interested in AI, web development, and hackathons. Looking forward to participating in PBCTF 5.0!",
      github: "https://github.com/testuser",
      linkedin: "https://linkedin.com/in/testuser",
      portfolio: "https://testuser.dev",
      ctf: "https://ctftime.org/user/testuser",
      referralCode: "TEST2024",
    });

    // Create a dummy PDF file for resume
    const resumeBlob = new Blob(["This is a test resume PDF content"], {
      type: "application/pdf",
    });
    const resumeFile = new File([resumeBlob], "test_resume.pdf", {
      type: "application/pdf",
    });
    setResume(resumeFile);
    setResumeFileName("test_resume.pdf");

    setAlert({
      type: "info",
      message: "Form auto-filled with test data! (Debug mode)",
    });
    setTimeout(() => setAlert(null), 3000);
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement login logic
    setAlert({
      type: "info",
      message: "Login functionality will be implemented separately",
    });
    setTimeout(() => setAlert(null), 3000);
  };

  const validateField = (fieldName: string, value: string): string | null => {
    switch (fieldName) {
      case "name":
        if (!value.trim()) return "Name is required";
        break;
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/\S+@\S+\.\S+/.test(value))
          return "Please enter a valid email address";
        break;
      case "password":
        const passwordRegex =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
        if (!value) return "Password is required";
        if (!passwordRegex.test(value))
          return "Password must be 8+ chars, incl, uppercase, lowercase, number, special char";
        break;
      case "confirmPassword":
        if (!value) return "Please confirm your password";
        if (value !== registerData.password) return "Passwords do not match";
        break;
      case "discord_username":
        if (!value.trim()) return "Discord username is required";
        break;
      case "phone":
        if (!value || !value.trim()) return "Phone is required";
        if (!isValidPhoneNumber(value)) {
          return "Please enter a valid phone number";
        }
        break;
      case "age":
        if (!value || !value.trim()) return "Age is required";
        const ageNum = parseInt(value.trim());
        if (isNaN(ageNum) || ageNum < 13 || ageNum > 100) {
          return "Please enter a valid age (13-100)";
        }
        break;
      case "organisation":
        if (!value.trim()) return "Organisation is required";
        break;
      case "github":
        if (!value.trim()) return "GitHub link is required";
        const githubPattern =
          /^(https?:\/\/)?(www\.)?github\.com\/[\w-]+(\/)?$/i;
        if (!githubPattern.test(value.trim())) {
          return "Please enter a valid GitHub URL (e.g., https://github.com/username)";
        }
        break;
      case "linkedin":
        if (!value.trim()) return "LinkedIn link is required";
        const linkedinPattern =
          /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|profile)\/[\w-]+(\/)?$/i;
        if (!linkedinPattern.test(value.trim())) {
          return "Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/username)";
        }
        break;
      case "portfolio":
        if (value.trim()) {
          try {
            new URL(value.trim());
          } catch {
            return "Please enter a valid portfolio URL";
          }
        }
        break;
      case "ctf":
        if (value.trim()) {
          try {
            new URL(value.trim());
          } catch {
            return "Please enter a valid CTF profile URL";
          }
        }
        break;
      default:
        return null;
    }
    return null;
  };

  const handleFieldBlur =
    (fieldName: string) =>
    (e?: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        fieldName === "phone" ? registerData.phone : e?.target.value || "";
      const error = validateField(fieldName, value);

      if (error) {
        setErrors((prev) => ({ ...prev, [fieldName]: error }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
    };

  const validateAllFields = (): Record<string, string> => {
    const validationErrors: Record<string, string> = {};

    const requiredFields: Array<keyof typeof registerData> = [
      "name",
      "email",
      "password",
      "confirmPassword",
      "discord_username",
      "phone",
      "age",
      "organisation",
      "github",
      "linkedin",
    ];

    requiredFields.forEach((field) => {
      const error = validateField(field as string, registerData[field]);
      if (error) {
        validationErrors[field as string] = error;
      }
    });

    const optionalFields: Array<keyof typeof registerData> = [
      "portfolio",
      "bio",
      "ctf",
    ];

    optionalFields.forEach((field) => {
      if (registerData[field] && registerData[field].trim()) {
        const error = validateField(field as string, registerData[field]);
        if (error) {
          validationErrors[field as string] = error;
        }
      }
    });

    if (!resume) {
      validationErrors.resume = "Resume is required";
    }
    if (!acceptedCodeOfConduct) {
      validationErrors.codeOfConduct =
        "You must accept the Code of Conduct to register";
    }

    return validationErrors;
  };
  const isFormValid = (): boolean => {
    const validationErrors = validateAllFields();
    return Object.keys(validationErrors).length === 0;
  };

  // Per-step validation
  const stepFieldMap: Record<StepId, Array<keyof typeof registerData>> = {
    account: ["email", "password", "confirmPassword"],
    identity: ["name", "age", "phone", "discord_username", "organisation"],
    profile: [],
    links: ["github", "linkedin", "portfolio", "ctf"],
    review: [],
  };

  const validateStep = (stepId: StepId): Record<string, string> => {
    const stepErrors: Record<string, string> = {};
    const fields = stepFieldMap[stepId];

    fields.forEach((field) => {
      const value = registerData[field] || "";
      const error = validateField(field as string, value);
      if (error) {
        stepErrors[field as string] = error;
      }
    });

    if (stepId === "profile" && !resume) {
      stepErrors.resume = "Resume is required";
    }

    return stepErrors;
  };

  const isStepValid = (stepId: StepId): boolean => {
    return Object.keys(validateStep(stepId)).length === 0;
  };

  const stepStatus = (idx: number): "complete" | "active" | "pending" => {
    if (idx < currentStepIndex) return "complete";
    if (idx === currentStepIndex) return "active";
    return "pending";
  };

  const goNext = () => {
    const stepId = STEPS[currentStepIndex].id;
    const stepErrors = validateStep(stepId);

    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      setAlert({
        type: "error",
        message: "Resolve the highlighted fields to continue.",
      });
      setTimeout(() => setAlert(null), 3000);
      return;
    }

    setAlert(null);
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((i) => i + 1);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const goBack = () => {
    setAlert(null);
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const jumpToStep = (idx: number) => {
    // Allow jumping back freely; jumping forward requires prior steps to be valid
    if (idx <= currentStepIndex) {
      setCurrentStepIndex(idx);
      setAlert(null);
      return;
    }
    for (let i = currentStepIndex; i < idx; i++) {
      const stepErrors = validateStep(STEPS[i].id);
      if (Object.keys(stepErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...stepErrors }));
        setAlert({
          type: "error",
          message: `Complete step ${i + 1} (${STEPS[i].label}) before advancing.`,
        });
        setTimeout(() => setAlert(null), 3000);
        return;
      }
    }
    setCurrentStepIndex(idx);
    setAlert(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateAllFields();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      // Save form data even when validation fails (text fields only — files
      // and their displayed names are intentionally not persisted).
      try {
        const { password, confirmPassword, ...safeRegisterData } = registerData;
        const dataToSave = {
          registerData: safeRegisterData,
        };
        localStorage.setItem(
          REGISTRATION_FORM_STORAGE_KEY,
          JSON.stringify(dataToSave),
        );
      } catch (error) {
        console.error("Error saving form data to localStorage:", error);
      }
      return;
    }

    setIsSubmitting(true);
    setAlert(null);
    try {
      // Save form data before submission to ensure it's persisted (text fields
      // only — files and their displayed names are intentionally not persisted).
      try {
        const { password, confirmPassword, ...safeRegisterData } = registerData;
        const dataToSave = {
          registerData: safeRegisterData,
        };
        localStorage.setItem(
          REGISTRATION_FORM_STORAGE_KEY,
          JSON.stringify(dataToSave),
        );
      } catch (error) {
        console.error("Error saving form data to localStorage:", error);
      }

      let formattedPhone = registerData.phone.trim();
      const phoneDigits = formattedPhone.replace(/\D/g, "");

      if (phoneDigits.length === 10) {
        formattedPhone = `+91${phoneDigits}`;
      } else if (phoneDigits.length === 12 && phoneDigits.startsWith("91")) {
        formattedPhone = `+${phoneDigits}`;
      } else if (phoneDigits.length === 11 && phoneDigits.startsWith("0")) {
        formattedPhone = `+91${phoneDigits.substring(1)}`;
      }
      // Create FormData for API request
      const formData = new FormData();
      formData.append("name", registerData.name);
      formData.append("email", registerData.email);
      formData.append("password", registerData.password);
      formData.append("discord_username", registerData.discord_username);
      formData.append("phone", formattedPhone);
      formData.append("age", registerData.age);
      formData.append("organisation", registerData.organisation);
      formData.append("bio", registerData.bio);
      formData.append("github_link", registerData.github);
      formData.append("linkedin_link", registerData.linkedin);

      if (resume) formData.append("resume", resume);
      if (profilePhoto) formData.append("profile_picture", profilePhoto);
      if (registerData.portfolio)
        formData.append("portfolio_link", registerData.portfolio);
      if (registerData.ctf) formData.append("ctf_profile", registerData.ctf);
      if (registerData.referralCode)
        formData.append("referral_code", registerData.referralCode);

      // reCAPTCHA v3 background token — scored server-side, no user interaction.
      const recaptchaToken = await executeRecaptcha("register");
      if (recaptchaToken) formData.append("recaptcha_token", recaptchaToken);

      await register(formData);

      // Clear localStorage on successful registration
      try {
        localStorage.removeItem(REGISTRATION_FORM_STORAGE_KEY);
      } catch (error) {
        console.error("Error clearing form data from localStorage:", error);
      }

      setAlert({
        type: "success",
        message: "Operator profile initialized. Routing to dashboard...",
      });

      // Give user time to see success message, then redirect
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          // Redirect to dashboard
          router.push("/dashboard");
        }
      }, 1500);
    } catch (error) {
      let errorMessage = "Registration failed. Please try again.";
      const fieldErrors: Record<string, string> = {};
      const fieldNameMap: Record<string, string> = {
        github_link: "github",
        linkedin_link: "linkedin",
        portfolio_link: "portfolio",
        ctf_profile: "ctf",
      };

      if (error instanceof Error) {
        const fieldErrorsFromApi = (error as any).fieldErrors;
        if (
          fieldErrorsFromApi &&
          typeof fieldErrorsFromApi === "object" &&
          Object.keys(fieldErrorsFromApi).length > 0
        ) {
          Object.keys(fieldErrorsFromApi).forEach((backendField) => {
            const frontendField = fieldNameMap[backendField] || backendField;
            fieldErrors[frontendField] = fieldErrorsFromApi[backendField];
          });
          const errorKeys = Object.keys(fieldErrors);
          if (errorKeys.length === 1) {
            errorMessage = fieldErrors[errorKeys[0]];
          } else {
            errorMessage = error.message || errorMessage;
          }
        } else {
          errorMessage = error.message || errorMessage;
          const errorMsg = error.message.toLowerCase();
          if (
            errorMsg.includes("email already exists") ||
            errorMsg.includes("email is already")
          ) {
            fieldErrors.email = "This email is already registered";
          } else if (
            errorMsg.includes("discord username already exists") ||
            errorMsg.includes("discord username is already")
          ) {
            fieldErrors.discord_username =
              "This Discord username is already registered";
          } else if (
            errorMsg.includes("phone number already exists") ||
            errorMsg.includes("phone number is already")
          ) {
            fieldErrors.phone = "This phone number is already registered";
          } else if (
            errorMsg.includes("invalid portfolio") ||
            errorMsg.includes("portfolio link")
          ) {
            fieldErrors.portfolio = "Invalid Portfolio URL";
          } else if (
            errorMsg.includes("invalid github") ||
            errorMsg.includes("github profile")
          ) {
            fieldErrors.github = "Invalid GitHub URL";
          } else if (
            errorMsg.includes("invalid linkedin") ||
            errorMsg.includes("linkedin profile")
          ) {
            fieldErrors.linkedin = "Invalid LinkedIn URL";
          }
        }
      } else if (typeof error === "string") {
        errorMessage = error;
        const errorMsg = error.toLowerCase();
        if (
          errorMsg.includes("invalid ctf") ||
          errorMsg.includes("ctf profile")
        ) {
          fieldErrors.ctf = "Invalid CTF profile URL";
        } else if (
          errorMsg.includes("invalid portfolio") ||
          errorMsg.includes("portfolio link")
        ) {
          fieldErrors.portfolio = "Invalid Portfolio URL";
        } else if (
          errorMsg.includes("invalid github") ||
          errorMsg.includes("github profile")
        ) {
          fieldErrors.github = "Invalid GitHub URL";
        } else if (
          errorMsg.includes("invalid linkedin") ||
          errorMsg.includes("linkedin profile")
        ) {
          fieldErrors.linkedin = "Invalid LinkedIn URL";
        }
      } else if (error && typeof error === "object" && "message" in error) {
        errorMessage = String(error.message);
        const errorMsg = errorMessage.toLowerCase();
        if (
          errorMsg.includes("invalid ctf") ||
          errorMsg.includes("ctf profile")
        ) {
          fieldErrors.ctf = "Invalid CTF profile URL";
        } else if (
          errorMsg.includes("invalid portfolio") ||
          errorMsg.includes("portfolio link")
        ) {
          fieldErrors.portfolio = "Invalid Portfolio URL";
        } else if (
          errorMsg.includes("invalid github") ||
          errorMsg.includes("github profile")
        ) {
          fieldErrors.github = "Invalid GitHub URL";
        } else if (
          errorMsg.includes("invalid linkedin") ||
          errorMsg.includes("linkedin profile")
        ) {
          fieldErrors.linkedin = "Invalid LinkedIn URL";
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        const fieldErrorKeys = Object.keys(fieldErrors);
        let toastMessage: string;
        let alertMessage: string;
        if (fieldErrorKeys.length === 1) {
          toastMessage = fieldErrors[fieldErrorKeys[0]];
          alertMessage = fieldErrors[fieldErrorKeys[0]];
        } else {
          const fieldDisplayNameMap: Record<string, string> = {
            ctf: "CTF Profile",
            portfolio: "Portfolio",
            github: "GitHub",
            linkedin: "LinkedIn",
            email: "Email",
            password: "Password",
            discord_username: "Discord Username",
            phone: "Phone",
            age: "Age",
            organisation: "Organisation",
            bio: "Bio",
            name: "Name",
          };

          const errorList = fieldErrorKeys
            .map((key) => {
              const fieldDisplayName =
                fieldDisplayNameMap[key] ||
                key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
              return `${fieldDisplayName}: ${fieldErrors[key]}`;
            })
            .join(", ");

          toastMessage = `Validation errors: ${errorList}`;
          alertMessage = `Resolve ${fieldErrorKeys.length} error(s) highlighted below.`;
        }

        setAlert({
          type: "error",
          message: alertMessage,
        });
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: toastMessage,
        });

        // Jump to the earliest step that contains an error so the user sees it
        const errorKeys = Object.keys(fieldErrors);
        const earliest = STEPS.findIndex((s) =>
          stepFieldMap[s.id].some((f) => errorKeys.includes(f as string)),
        );
        if (earliest >= 0 && earliest < currentStepIndex) {
          setCurrentStepIndex(earliest);
        }
      } else {
        setAlert({
          type: "error",
          message: errorMessage,
        });
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: errorMessage,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const maxSize = 1 * 1024 * 1024; // 1MB

      if (file.type !== "application/pdf") {
        setErrors({ ...errors, resume: "Please upload a PDF file" });
        return;
      }

      if (file.size > maxSize) {
        setErrors({ ...errors, resume: "Resume file size must be under 1MB" });
        return;
      }

      setResume(file);
      setResumeFileName(file.name);
      if (errors.resume) {
        const newErrors = { ...errors };
        delete newErrors.resume;
        setErrors(newErrors);
      }
    }
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const maxSize = 1 * 1024 * 1024; // 1MB

      if (!file.type.includes("image")) {
        setErrors({ ...errors, profilePhoto: "Please upload an image file" });
        return;
      }

      if (file.size > maxSize) {
        setErrors({
          ...errors,
          profilePhoto: "Profile photo file size must be under 1MB",
        });
        return;
      }

      setProfilePhoto(file);
      setProfilePhotoFileName(file.name);
      if (errors.profilePhoto) {
        const newErrors = { ...errors };
        delete newErrors.profilePhoto;
        setErrors(newErrors);
      }
    }
  };

  // Clear all form data and localStorage
  const handleClearData = () => {
    // Clear localStorage
    try {
      localStorage.removeItem(REGISTRATION_FORM_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing form data from localStorage:", error);
    }

    // Reset form data to empty values
    setRegisterData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      discord_username: "",
      phone: "",
      age: "",
      organisation: "",
      bio: "",
      github: "",
      linkedin: "",
      portfolio: "",
      ctf: "",
      referralCode: "",
    });

    // Clear file states
    setResume(null);
    setProfilePhoto(null);
    setResumeFileName("");
    setProfilePhotoFileName("");

    // Clear errors
    setErrors({});

    // Reset file inputs by changing key
    setFileInputKey((prev) => prev + 1);

    // Reset code of conduct acceptance
    setAcceptedCodeOfConduct(false);

    // Reset wizard step
    setCurrentStepIndex(0);

    // Show confirmation
    toast({
      title: "Form Cleared",
      description: "All form data has been cleared.",
    });
  };

  const currentStep = STEPS[currentStepIndex];
  const progressPct = ((currentStepIndex + 1) / STEPS.length) * 100;
  const stepNumber = String(currentStepIndex + 1).padStart(2, "0");

  // Reusable mini-row for review step
  const reviewRow = (
    label: string,
    value: string | null | undefined,
    stepIdx: number,
  ) => (
    <div className="flex items-start justify-between gap-3 py-2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-0.5">
          {label}
        </div>
        <div className="text-[13px] text-ink truncate">
          {value && value.toString().trim() ? (
            value
          ) : (
            <span className="text-ink-disabled italic">- not set</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setCurrentStepIndex(stepIdx)}
        className="shrink-0 text-ink-muted hover:text-brand transition-colors p-1 rounded-md hover:bg-white/[0.03]"
        aria-label={`Edit ${label}`}
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-[760px] mx-auto">
      {/* ===================== HERO / OPERATOR BRIEFING ===================== */}
      <header className="relative overflow-hidden rounded-lg border border-[var(--border-soft)] bg-surface-1/60 backdrop-blur-[6px]">
<div className="relative z-10 flex flex-col gap-4 p-5 sm:p-7">
          <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
            <span className="inline-flex w-1.5 h-1.5 rounded-full bg-brand shadow-glow-sm" />
            <span>&gt;</span>
            <span>operator_intake // pbctf 5.0</span>
            <span className="anim-blink">_</span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-[28px] sm:text-[34px] md:text-[40px] font-semibold text-ink tracking-tight leading-[1.05]">
              Initialize operator profile
            </h1>
            <p className="text-[14px] sm:text-[15px] text-ink-secondary leading-[1.55] max-w-[58ch]">
              Five short steps. Your data is auto-saved locally after every
              keystroke. close the tab, come back, pick up where you left off.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-brand/35 bg-brand/5">
              <span className="inline-flex w-1.5 h-1.5 rounded-full bg-brand anim-blink" />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
                intake open
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border-soft)] hover:border-brand/45 text-ink-secondary hover:text-brand transition-colors font-mono text-[10.5px] uppercase tracking-[0.22em]"
            >
              <LogIn className="w-3 h-3" />
              already an operator? authenticate
            </button>
            {DEBUG_MODE && (
              <>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border-soft)] hover:border-brand/45 text-ink-secondary hover:text-brand transition-colors font-mono text-[10.5px] uppercase tracking-[0.22em]"
                >
                  <Zap className="w-3 h-3" />
                  auto-fill (debug)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast({
                      title: "Debug Toast",
                      description:
                        "If you can see this, toasts are working.",
                      variant: "destructive",
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border-soft)] hover:border-brand/45 text-ink-secondary hover:text-brand transition-colors font-mono text-[10.5px] uppercase tracking-[0.22em]"
                >
                  <Zap className="w-3 h-3" />
                  toast (debug)
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ===================== STICKY ALERT ===================== */}
      {alert && (
        <StickyAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* ===================== PROGRESS RAIL ===================== */}
      <nav
        aria-label="Registration progress"
        className="relative rounded-lg border border-[var(--border-soft)] bg-surface-1/70 backdrop-blur-[6px] p-4 sm:p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
            step {stepNumber} / {STEPS.length} · {currentStep.label}
          </div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted">
            {Math.round(progressPct)}% complete
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-1 w-full rounded-full bg-surface-inset overflow-hidden mb-4">
          <div
            className="absolute inset-y-0 left-0 bg-brand shadow-glow-sm transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Step pills */}
        <ol className="grid grid-cols-5 gap-1.5">
          {STEPS.map((step, idx) => {
            const status = stepStatus(idx);
            const Icon = step.icon;
            const isActive = status === "active";
            const isDone = status === "complete";
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => jumpToStep(idx)}
                  className={[
                    "group w-full flex flex-col items-center gap-1.5 px-1 py-2 rounded-md border transition-all",
                    isActive
                      ? "border-brand/55 bg-brand/8 shadow-glow-sm"
                      : isDone
                        ? "border-brand/25 bg-brand/[0.03] hover:border-brand/45"
                        : "border-[var(--border-hairline)] hover:border-[var(--border-default)]",
                  ].join(" ")}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div
                    className={[
                      "inline-flex items-center justify-center w-7 h-7 rounded-md border transition-colors",
                      isActive
                        ? "border-brand bg-brand/15 text-brand"
                        : isDone
                          ? "border-brand/55 bg-brand/10 text-brand"
                          : "border-[var(--border-soft)] text-ink-muted",
                    ].join(" ")}
                  >
                    {isDone ? (
                      <CircleCheck className="w-3.5 h-3.5" />
                    ) : isActive ? (
                      <CircleDot className="w-3.5 h-3.5" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div
                    className={[
                      "font-mono text-[9.5px] sm:text-[10px] uppercase tracking-[0.18em] text-center leading-tight",
                      isActive
                        ? "text-brand"
                        : isDone
                          ? "text-ink-secondary"
                          : "text-ink-muted",
                    ].join(" ")}
                  >
                    {String(idx + 1).padStart(2, "0")}
                    <span className="hidden sm:inline"> · {step.label}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ===================== ACTIVE STEP CARD ===================== */}
      <FormSection
        eyebrow={`step ${stepNumber} · ${currentStep.hint}`}
        title={
          currentStepIndex === 0
            ? "Set up credentials"
            : currentStepIndex === 1
              ? "Identify yourself"
              : currentStepIndex === 2
                ? "Build your profile"
                : currentStepIndex === 3
                  ? "Attach the receipts"
                  : "Confirm and submit"
        }
        status={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearData}
            disabled={isSubmitting}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Reset
          </Button>
        }
      >
        <form
          onSubmit={handleRegister}
          className="flex flex-col gap-5"
          noValidate
        >
          {/* ---------- STEP 1: ACCOUNT ---------- */}
          {currentStep.id === "account" && (
            <div className="flex flex-col gap-4 anim-fade-up">
              <p className="text-[13px] text-ink-secondary leading-[1.55]">
                Choose how you&apos;ll sign in. Email becomes your operator
                handle.
              </p>
              <FormInput
                label="Email Address"
                type="email"
                placeholder="your.email@example.com"
                required
                value={registerData.email}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    email: e.target.value,
                  })
                }
                onBlur={handleFieldBlur("email")}
                error={errors.email}
              />
              <FormInput
                label="Password"
                type="password"
                placeholder="8+ chars · upper · lower · number · symbol"
                required
                value={registerData.password}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    password: e.target.value,
                  })
                }
                onBlur={handleFieldBlur("password")}
                error={errors.password}
              />
              <FormInput
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                required
                value={registerData.confirmPassword}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    confirmPassword: e.target.value,
                  })
                }
                onBlur={handleFieldBlur("confirmPassword")}
                error={errors.confirmPassword}
              />
              <div className="flex items-start gap-2 mt-1 p-3 rounded-md border border-[var(--border-hairline)] bg-surface-inset/60">
                <Lock className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" />
                <p className="text-[12px] text-ink-muted leading-[1.5]">
                  Passwords are never saved to your browser. Everything else
                  auto-saves locally so you can refresh without losing
                  progress.
                </p>
              </div>
            </div>
          )}

          {/* ---------- STEP 2: IDENTITY ---------- */}
          {currentStep.id === "identity" && (
            <div className="flex flex-col gap-4 anim-fade-up">
              <p className="text-[13px] text-ink-secondary leading-[1.55]">
                Recruiters and teammates use this info to recognize you.
              </p>
              <FormInput
                label="Full Name"
                placeholder="John Doe"
                required
                value={registerData.name}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    name: e.target.value,
                  })
                }
                onBlur={handleFieldBlur("name")}
                error={errors.name}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Age"
                  type="number"
                  placeholder="22"
                  required
                  value={registerData.age}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      age: e.target.value,
                    })
                  }
                  onBlur={handleFieldBlur("age")}
                  error={errors.age}
                />
                <FormInput
                  label="Discord Username"
                  placeholder="username"
                  required
                  value={registerData.discord_username}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      discord_username: e.target.value,
                    })
                  }
                  onBlur={handleFieldBlur("discord_username")}
                  error={errors.discord_username}
                />
              </div>
              <FormPhoneInput
                label="Phone"
                placeholder="Enter phone number"
                required
                value={registerData.phone}
                onChange={(value) =>
                  setRegisterData({
                    ...registerData,
                    phone: value || "",
                  })
                }
                onBlur={handleFieldBlur("phone")}
                error={errors.phone}
              />
              <FormInput
                label="Organisation"
                placeholder="Your University / Company"
                required
                value={registerData.organisation}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    organisation: e.target.value,
                  })
                }
                onBlur={handleFieldBlur("organisation")}
                error={errors.organisation}
              />
            </div>
          )}

          {/* ---------- STEP 3: PROFILE ---------- */}
          {currentStep.id === "profile" && (
            <div className="flex flex-col gap-4 anim-fade-up">
              <p className="text-[13px] text-ink-secondary leading-[1.55]">
                Your resume is required so teams can spot you. Bio and photo
                are optional but recommended. they help you stand out in
                recruitment.
              </p>
              <FormTextarea
                label="Bio"
                placeholder="One paragraph on what you hack on, what you're into, and what you want from PBCTF."
                value={registerData.bio}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    bio: e.target.value,
                  })
                }
                onBlur={handleFieldBlur("bio")}
                rows={4}
                error={errors.bio}
              />
              <div className="grid grid-cols-1 gap-4">
                <div key={`resume-${fileInputKey}`}>
                  <FormFileUpload
                    label="Resume (PDF · max 1MB)"
                    accept=".pdf"
                    required
                    onChange={handleResumeChange}
                    currentFile={resumeFileName}
                  />
                  {errors.resume && (
                    <span className="block mt-1.5 text-[12px] text-[var(--danger)] font-mono">
                      {errors.resume}
                    </span>
                  )}
                </div>
                <div key={`profile-${fileInputKey}`}>
                  <FormFileUpload
                    label="Profile Photo (image · max 1MB · optional)"
                    accept="image/*"
                    onChange={handleProfilePhotoChange}
                    currentFile={profilePhotoFileName}
                  />
                  {errors.profilePhoto && (
                    <span className="block mt-1.5 text-[12px] text-[var(--danger)] font-mono">
                      {errors.profilePhoto}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ---------- STEP 4: LINKS ---------- */}
          {currentStep.id === "links" && (
            <div className="flex flex-col gap-5 anim-fade-up">
              <p className="text-[13px] text-ink-secondary leading-[1.55]">
                More links = a stronger signal to potential teams. Two are
                required; the rest sharpen your profile.
              </p>

              <div className="flex flex-col gap-3">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
                  &gt; required
                </div>
                <FormInput
                  label="GitHub"
                  placeholder="https://github.com/username"
                  required
                  value={registerData.github}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      github: e.target.value,
                    })
                  }
                  onBlur={handleFieldBlur("github")}
                  error={errors.github}
                />
                <FormInput
                  label="LinkedIn"
                  placeholder="https://linkedin.com/in/username"
                  required
                  value={registerData.linkedin}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      linkedin: e.target.value,
                    })
                  }
                  onBlur={handleFieldBlur("linkedin")}
                  error={errors.linkedin}
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted">
                  // optional · boost your visibility
                </div>
                <FormInput
                  label="Portfolio"
                  placeholder="https://yourportfolio.com"
                  value={registerData.portfolio}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      portfolio: e.target.value,
                    })
                  }
                  onBlur={handleFieldBlur("portfolio")}
                  error={errors.portfolio}
                />
                <FormInput
                  label="CTF Profile"
                  placeholder="https://ctftime.org/user/yourname"
                  value={registerData.ctf}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      ctf: e.target.value,
                    })
                  }
                  onBlur={handleFieldBlur("ctf")}
                  error={errors.ctf}
                />
              </div>
            </div>
          )}

          {/* ---------- STEP 5: REVIEW ---------- */}
          {currentStep.id === "review" && (
            <div className="flex flex-col gap-5 anim-fade-up">
              <p className="text-[13px] text-ink-secondary leading-[1.55]">
                Final scan. Tap any pencil to edit a field. your data stays
                intact.
              </p>

              <div className="rounded-md border border-[var(--border-soft)] bg-surface-inset/50 p-4">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand mb-3">
                  &gt; account
                </div>
                {reviewRow("Email", registerData.email, 0)}
                {reviewRow(
                  "Password",
                  registerData.password ? "••••••••" : "",
                  0,
                )}
              </div>

              <div className="rounded-md border border-[var(--border-soft)] bg-surface-inset/50 p-4">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand mb-3">
                  &gt; identity
                </div>
                {reviewRow("Name", registerData.name, 1)}
                {reviewRow("Age", registerData.age, 1)}
                {reviewRow("Phone", registerData.phone, 1)}
                {reviewRow("Discord", registerData.discord_username, 1)}
                {reviewRow("Organisation", registerData.organisation, 1)}
              </div>

              <div className="rounded-md border border-[var(--border-soft)] bg-surface-inset/50 p-4">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand mb-3">
                  &gt; profile
                </div>
                {reviewRow("Bio", registerData.bio, 2)}
                {reviewRow(
                  "Resume",
                  resumeFileName || (resume ? "uploaded" : ""),
                  2,
                )}
                {reviewRow(
                  "Profile Photo",
                  profilePhotoFileName || (profilePhoto ? "uploaded" : ""),
                  2,
                )}
              </div>

              <div className="rounded-md border border-[var(--border-soft)] bg-surface-inset/50 p-4">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand mb-3">
                  &gt; links
                </div>
                {reviewRow("GitHub", registerData.github, 3)}
                {reviewRow("LinkedIn", registerData.linkedin, 3)}
                {reviewRow("Portfolio", registerData.portfolio, 3)}
                {reviewRow("CTF Profile", registerData.ctf, 3)}
              </div>

              {/* Code of Conduct gate -- accept-only-via-modal flow */}
              <div className="rounded-md border border-brand/35 bg-brand/[0.04] p-4">
                <div className="flex items-start gap-3">
                  <span
                    className={[
                      "shrink-0 mt-0.5 inline-flex items-center justify-center w-[18px] h-[18px] rounded-[4px] border transition-colors",
                      acceptedCodeOfConduct
                        ? "bg-brand border-brand"
                        : "bg-surface-2 border-[var(--border-default)]",
                    ].join(" ")}
                    aria-hidden
                  >
                    {acceptedCodeOfConduct && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#03110a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <div className="flex-1 text-[13px] text-ink leading-[1.55]">
                    <div className="font-semibold">
                      {acceptedCodeOfConduct ? "Code of Conduct accepted" : "Read and accept the Code of Conduct"}
                    </div>
                    <p className="mt-1 text-[12px] text-ink-secondary font-normal">
                      Required. Covers respect, fair play, and venue rules.
                    </p>
                    {!acceptedCodeOfConduct && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCodeOfConductModalOpen(true);
                          if (errors.codeOfConduct) {
                            const newErrors = { ...errors };
                            delete newErrors.codeOfConduct;
                            setErrors(newErrors);
                          }
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 text-brand hover:text-brand-hover underline underline-offset-2 font-semibold transition-colors"
                      >
                        Open Code of Conduct
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                    {acceptedCodeOfConduct && (
                      <button
                        type="button"
                        onClick={() => setIsCodeOfConductModalOpen(true)}
                        className="mt-2 inline-flex items-center gap-1.5 text-ink-muted hover:text-ink underline underline-offset-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors"
                      >
                        review again
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                {errors.codeOfConduct && (
                  <span className="block mt-2 text-[12px] text-[var(--danger)] font-mono">
                    {errors.codeOfConduct}
                  </span>
                )}
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting || !isFormValid()}
              >
                {isSubmitting && <Spinner size="sm" className="mr-2" />}
                {isSubmitting ? (
                  "Initializing operator profile..."
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Initialize operator profile
                  </>
                )}
              </Button>
              <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted">
                {!isFormValid() && !isSubmitting
                  ? "// resolve highlighted issues to submit"
                  : "// ready to commit"}
              </p>
            </div>
          )}

          {/* ===================== NAV CONTROLS ===================== */}
          {currentStep.id !== "review" && (
            <div className="flex items-center justify-between gap-3 pt-2 mt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                disabled={currentStepIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted hidden sm:block">
                {STEPS.length - currentStepIndex - 1} step
                {STEPS.length - currentStepIndex - 1 === 1 ? "" : "s"} to go
              </div>
              <Button type="button" variant="primary" onClick={goNext}>
                Continue
                <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}

          {currentStep.id === "review" && currentStepIndex > 0 && (
            <div className="flex items-center justify-between gap-3 pt-2 mt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                disabled={isSubmitting}
              >
                <ChevronLeft className="w-4 h-4 mr-1.5" />
                Back to links
              </Button>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted hidden sm:block">
                final step
              </div>
              <div className="w-[88px]" aria-hidden />
            </div>
          )}
        </form>
      </FormSection>

      {/* ===================== FOOTER HINT ===================== */}
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted">
          // data auto-saved locally · safe to refresh
        </div>
        <RecaptchaNotice />
      </div>

      {/* ===================== CODE OF CONDUCT MODAL ===================== */}
      {isCodeOfConductModalOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Code of Conduct"
        >
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-[6px]"
            onClick={() => setIsCodeOfConductModalOpen(false)}
            aria-hidden
          />

          <div className="relative z-[101] w-full max-w-3xl max-h-[88vh] bg-surface-2 border border-[var(--border-default)] rounded-t-xl sm:rounded-lg shadow-modal anim-fade-up flex flex-col">
            {/* Sticky header */}
            <div className="flex items-center justify-between gap-4 px-5 md:px-6 py-4 bg-surface-2 shrink-0">
              <div className="min-w-0 flex items-center gap-2.5">
                <span className="text-mono text-brand text-[12px] leading-none">{">"}</span>
                <h2 className="font-heading text-[16px] md:text-[18px] font-semibold text-ink truncate tracking-tight">
                  Code of Conduct
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCodeOfConductModalOpen(false)}
                aria-label="Close"
                className="inline-flex w-8 h-8 items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-white/[0.05] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div
              ref={cocScrollRef}
              onScroll={handleCocScroll}
              className="flex-1 min-h-0 overflow-y-auto thin-scrollbar px-5 md:px-6 py-5 md:py-6"
            >
              <div className="flex flex-col gap-5 text-ink">
                <div>
                  <h3 className="text-[18px] font-semibold mb-2 font-heading text-ink">Overview</h3>
                  <p className="text-[14px] leading-[22px] text-ink-secondary">
                    Point Blank is committed to providing a safe, inclusive, and respectful environment for all CTF participants.
                  </p>
                  <p className="text-[14px] leading-[22px] text-ink-secondary mt-2">
                    By participating, you agree to follow this Code of Conduct.
                  </p>
                </div>

                <div>
                  <h3 className="text-[18px] font-semibold mb-2 font-heading text-ink">Respect &amp; Professionalism</h3>
                  <ul className="list-disc list-inside space-y-1 text-[14px] leading-[22px] text-ink-secondary ml-2">
                    <li>Treat all participants, organizers, and volunteers with respect</li>
                    <li>Maintain a friendly and inclusive environment</li>
                    <li>Professional behavior is expected at all times</li>
                    <li>Flag sharing is cheating.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-[18px] font-semibold mb-2 font-heading text-ink">Communication Guidelines</h3>
                  <ul className="list-disc list-inside space-y-1 text-[14px] leading-[22px] text-ink-secondary ml-2">
                    <li>Use designated communication channels (Discord Channel)</li>
                    <li>Keep discussions relevant to the competition</li>
                    <li>No spam, repetitive messages, or off-topic content</li>
                    <li>Avoid promotional content or unrelated links</li>
                  </ul>
                  <p className="text-[14px] leading-[22px] text-ink-secondary mt-2">
                    This applies across all CTF-related spaces and platforms.
                  </p>
                </div>

                <div>
                  <h3 className="text-[18px] font-semibold mb-2 font-heading text-ink">Content Standards</h3>
                  <ul className="list-disc list-inside space-y-1 text-[14px] leading-[22px] text-ink-secondary ml-2">
                    <li>No racist, sexist, or discriminatory language</li>
                    <li>Keep all content appropriate and professional</li>
                    <li>No sexually explicit or inappropriate material</li>
                    <li>Maintain a safe environment for all participants</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-[18px] font-semibold mb-2 font-heading text-ink">Venue Etiquette</h3>
                  <ul className="list-disc list-inside space-y-1 text-[14px] leading-[22px] text-ink-secondary ml-2">
                    <li>Keep your workspace clean and organized</li>
                    <li>Personal snacks allowed (clean up after yourself)</li>
                    <li>Respect venue property and equipment</li>
                    <li>Follow all venue guidelines and regulations</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-[18px] font-semibold mb-2 font-heading text-ink">Enforcement</h3>
                  <ul className="list-disc list-inside space-y-1 text-[14px] leading-[22px] text-ink-secondary ml-2">
                    <li>Point Blank reserves the right to take action for violations, including warnings, disqualification, or removal from the event.</li>
                    <li>Reports of misconduct will be handled confidentially.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-[18px] font-semibold mb-2 font-heading text-ink">Final Note</h3>
                  <p className="text-[14px] leading-[22px] text-ink-secondary mt-2">
                    Bring curiosity, participate responsibly, and respect the community.
                  </p>
                  <p className="text-[14px] leading-[22px] text-ink-muted mt-3 text-right font-mono">
                    . Point Blank
                  </p>
                </div>

                <div className="h-2" aria-hidden />
              </div>
            </div>

            {/* Sticky footer with scroll-gated accept */}
            <div className="px-5 md:px-6 py-4 bg-surface-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted">
                {cocScrolledToBottom
                  ? "// reached the end. ready to accept"
                  : "// scroll to the end to enable accept"}
              </p>
              <Button
                onClick={() => {
                  setAcceptedCodeOfConduct(true);
                  setIsCodeOfConductModalOpen(false);
                  if (errors.codeOfConduct) {
                    const newErrors = { ...errors };
                    delete newErrors.codeOfConduct;
                    setErrors(newErrors);
                  }
                }}
                variant="primary"
                disabled={!cocScrolledToBottom}
              >
                I Accept
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
