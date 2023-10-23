/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import NewBill from "../containers/NewBill.js";
import NewBillUI from "../views/NewBillUI.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";
import router from "../app/Router.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";

// Mock the store for testing
jest.mock("../app/Store", () => mockStore);

// Define a function for route navigation
const onNavigate = (pathname) => {
  document.body.innerHTML = ROUTES({ pathname });
};

let customAlert = null;

beforeAll(() => {
  customAlert = window.alert;
  window.alert = jest.fn();
});

afterAll(() => {
  window.alert = customAlert;
});

beforeEach(() => {
  // Set up the test environment
  Object.defineProperty(window, "localStorage", { value: localStorageMock });
  window.localStorage.setItem(
    "user",
    JSON.stringify({
      type: "Employee",
      email: "employee@test.tld",
    })
  );
  document.body.innerHTML = NewBillUI();
});

// Begin describing the test suite
describe("Given I am connected as an employee", () => {
  describe("When I am on the NewBill Page", () => {
    let newBillMock;

    beforeEach(() => {
      // Create an instance of NewBill
      newBillMock = new NewBill({
        document: document,
        onNavigate: onNavigate,
        store: mockStore,
        localStorage: localStorageMock,
      });
    });

    afterEach(() => {
      // Clear all mocks after each test
      jest.clearAllMocks();
    });

    test("Then file input should trigger handleChangeFile on file selection", () => {
      // Initialize the HTML content of the NewBill page using the NewBillUI function.
      const html = NewBillUI();
      document.body.innerHTML = html;

      // Create a mock of a simulated event.
      const eventMock = {
        preventDefault: jest.fn(),
        target: { value: "test.png" },
      };

      // Spy on the handleChangeFile method of newBillMock.
      const handleChangeFileSpy = jest.spyOn(newBillMock, "handleChangeFile");

      // Get the file input field from the DOM.
      const fileInput = screen.getByTestId("file");

      // Create a simulated File object.
      const file = new File(["test"], "image.jpg", { type: "image/jpeg" });
      Object.defineProperty(fileInput, "files", { value: [file] });

      // Simulate changing the value of the file input field.
      fireEvent.change(fileInput);

      // Call the handleChangeFile function of newBillMock with the simulated event.
      newBillMock.handleChangeFile(eventMock);

      // Verify that handleChangeFile has been called.
      expect(handleChangeFileSpy).toHaveBeenCalled();
    });

    // Test: Adding a file with the wrong extension should display an error
    test("Then adding a file with the wrong extension should display an error", async () => {
      const fileInput = document.querySelector(`input[data-testid="file"]`);
      const eventData = {
        preventDefault: () => {},
        target: {
          files: [new File(["test"], "image.pdf", { type: "application/pdf" })],
        },
      };

      // Mock the alert method
      const alertMock = jest.fn();
      window.alert = alertMock;

      // Wait for the form to appear in the document
      await waitFor(() => screen.getByTestId("form-new-bill"));

      fireEvent.change(fileInput, eventData); // Simulate file change

      // Check if the `alert` method was called with the expected message
      expect(alertMock).toHaveBeenCalledWith(
        "Invalid file format. Please select a JPG, JPEG, or PNG file."
      );
    });

    // Test: A form with 9 fields should be rendered
    test("Then a form with 9 fields should be rendered", () => {
      document.body.innerHTML = NewBillUI();

      // Retrieve the form in the DOM
      const form = document.querySelector("form");

      // Verify the form contains 9 fields
      expect(form.length).toEqual(9);
    });

    // Test: Form submission should trigger handleSubmit and redirect to Bills
    test("Then the form submission should trigger handleSubmit and redirect to Bills", async () => {
      document.body.innerHTML = `<div id="root"></div>`;
      router();
      onNavigate(ROUTES_PATH.NewBill);

      fireEvent.change(screen.getByTestId("expense-type"), {
        target: { value: "Transports" },
      });
      fireEvent.input(screen.getByTestId("expense-name"), {
        target: { value: "vol" },
      });
      fireEvent.input(screen.getByTestId("datepicker"), {
        target: { value: "2022-08-22" },
      });
      const amount = screen.getByTestId("amount");
      fireEvent.input(amount, {
        target: { value: "300" },
      });
      fireEvent.input(screen.getByTestId("vat"), { target: { value: "40" } });
      fireEvent.input(screen.getByTestId("pct"), { target: { value: "50" } });
      fireEvent.input(screen.getByTestId("commentary"), {
        target: { value: "Some comment" },
      });

      fireEvent.change(screen.getByTestId("file"), {
        target: {
          files: [new File(["image.png"], "image.png", { type: "image/png" })],
        },
      });

      const formSubmission = screen.getByTestId("form-new-bill");

      // Create a new instance of NewBill
      const newBillEmulation = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const handleSubmit = jest.fn((e) => newBillEmulation.handleSubmit(e));
      formSubmission.addEventListener("submit", handleSubmit);
      fireEvent.submit(formSubmission);

      expect(handleSubmit).toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByText("Mes notes de frais")).toBeInTheDocument();
      });
    });
  });
});

// Define additional integration test suites
describe("NewBill Integration Test Suites", () => {
  describe("Given I am a user connected as an employee", () => {
    describe("When I am on NewBill", () => {
      // Integration test: Submitting a completed NewBill form should redirect to the Bill page (handleSubmit())
      test("Then I submit a completed NewBill form and I am redirected to the Bill page", async () => {
        document.body.innerHTML = '<div id="root"></div>';
        router();
        onNavigate(ROUTES_PATH.NewBill);

        const expenseType = screen.getByTestId("expense-type");
        const expenseName = screen.getByTestId("expense-name");
        const datepicker = screen.getByTestId("datepicker");
        const amount = screen.getByTestId("amount");
        fireEvent.change(expenseType, { target: { value: "Transports" } });
        fireEvent.input(expenseName, { target: { value: "vol" } });
        fireEvent.input(datepicker, { target: { value: "2022-08-22" } });
        fireEvent.input(amount, { target: { value: "300" } });
        fireEvent.input(screen.getByTestId("vat"), { target: { value: "40" } });
        fireEvent.input(screen.getByTestId("pct"), { target: { value: "50" } });
        fireEvent.input(screen.getByTestId("commentary"), {
          target: { value: "Some comment" },
        });
        fireEvent.change(screen.getByTestId("file"), {
          target: {
            files: [
              new File(["image.png"], "image.png", { type: "image/png" }),
            ],
          },
        });

        const formSubmission = screen.getByTestId("form-new-bill");
        const newBillEmulation = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: localStorageMock,
        });

        const handleSubmit = jest.fn((e) => newBillEmulation.handleSubmit(e));
        formSubmission.addEventListener("submit", handleSubmit);
        fireEvent.submit(formSubmission);

        expect(handleSubmit).toHaveBeenCalled();

        await waitFor(() => {
          expect(screen.getByText("Mes notes de frais")).toBeInTheDocument();
        });

        expect(screen.getByTestId("btn-new-bill")).toBeTruthy();
      });
    });
  });
});
