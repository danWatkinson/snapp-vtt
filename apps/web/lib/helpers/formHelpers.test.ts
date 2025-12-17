import { describe, it, expect } from "vitest";
import {
  createFormFieldSetter,
  createFormFieldSetters,
  createSelectionSetter,
  createSelectionSetters,
  createModalHandler,
  createModalHandlers,
  getFormField,
  getFormValues
} from "./formHelpers";
import type { ReturnType } from "../hooks/useFormState";

describe("formHelpers", () => {
  describe("createFormFieldSetter", () => {
    it("should create a setter function for a form field", () => {
      const mockForm = {
        form: { name: "John", email: "john@example.com" },
        setField: (field: string, value: any) => {
          mockForm.form = { ...mockForm.form, [field]: value };
        }
      } as unknown as ReturnType<{ name: string; email: string }>;

      const setName = createFormFieldSetter(mockForm, "name");
      setName("Jane");

      expect(mockForm.form.name).toBe("Jane");
    });
  });

  describe("createFormFieldSetters", () => {
    it("should create multiple form field setters", () => {
      const mockForm = {
        form: { name: "", email: "" },
        setField: (field: string, value: any) => {
          mockForm.form = { ...mockForm.form, [field]: value };
        }
      } as unknown as ReturnType<{ name: string; email: string }>;

      const setters = createFormFieldSetters(mockForm, ["name", "email"]);

      expect(typeof setters.setName).toBe("function");
      expect(typeof setters.setEmail).toBe("function");

      setters.setName("John");
      setters.setEmail("john@example.com");

      expect(mockForm.form.name).toBe("John");
      expect(mockForm.form.email).toBe("john@example.com");
    });
  });

  describe("createSelectionSetter", () => {
    it("should create a setter function for a selection field", () => {
      let selectedValue: string | null = null;
      const setSelectionField = (field: string, value: any) => {
        selectedValue = value;
      };

      const setWorldId = createSelectionSetter(setSelectionField, "worldId");
      setWorldId("world-123");

      expect(selectedValue).toBe("world-123");
    });
  });

  describe("createSelectionSetters", () => {
    it("should create multiple selection setters", () => {
      const selections: Record<string, string | null> = {};
      const setSelectionField = (field: string, value: any) => {
        selections[field] = value;
      };

      const setters = createSelectionSetters(setSelectionField, ["worldId", "campaignId"]);

      expect(typeof setters.setSelectedWorldId).toBe("function");
      expect(typeof setters.setSelectedCampaignId).toBe("function");

      setters.setSelectedWorldId("world-123");
      setters.setSelectedCampaignId("campaign-456");

      expect(selections.worldId).toBe("world-123");
      expect(selections.campaignId).toBe("campaign-456");
    });
  });

  describe("createModalHandler", () => {
    it("should open modal when called with true", () => {
      let openedModal: string | null = null;
      const openModal = (key: string) => {
        openedModal = key;
      };
      const closeModal = () => {};

      const handleLoginModal = createModalHandler(openModal, closeModal, "login");
      handleLoginModal(true);

      expect(openedModal).toBe("login");
    });

    it("should close modal when called with false", () => {
      let closedModal: string | null = null;
      const openModal = () => {};
      const closeModal = (key: string) => {
        closedModal = key;
      };

      const handleLoginModal = createModalHandler(openModal, closeModal, "login");
      handleLoginModal(false);

      expect(closedModal).toBe("login");
    });
  });

  describe("createModalHandlers", () => {
    it("should create multiple modal handlers", () => {
      const openedModals: string[] = [];
      const openModal = (key: string) => {
        openedModals.push(key);
      };
      const closeModal = () => {};

      const handlers = createModalHandlers(openModal, closeModal, ["login", "createUser"]);

      expect(typeof handlers.setLoginModalOpen).toBe("function");
      expect(typeof handlers.setCreateUserModalOpen).toBe("function");

      handlers.setLoginModalOpen(true);
      handlers.setCreateUserModalOpen(true);

      expect(openedModals).toEqual(["login", "createUser"]);
    });
  });

  describe("getFormField", () => {
    it("should get a form field value", () => {
      const mockForm = {
        form: { name: "John", email: "john@example.com" }
      } as unknown as ReturnType<{ name: string; email: string }>;

      expect(getFormField(mockForm, "name")).toBe("John");
      expect(getFormField(mockForm, "email")).toBe("john@example.com");
    });
  });

  describe("getFormValues", () => {
    it("should get all form field values", () => {
      const mockForm = {
        form: { name: "John", email: "john@example.com" }
      } as unknown as ReturnType<{ name: string; email: string }>;

      const values = getFormValues(mockForm);
      expect(values).toEqual({ name: "John", email: "john@example.com" });
    });
  });
});
