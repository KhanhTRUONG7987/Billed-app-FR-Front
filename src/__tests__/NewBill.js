/**
 * @jest-environment jsdom
 */

// Import necessary testing libraries and modules
import "@testing-library/jest-dom";
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import router from "../app/Router.js";

// Mock the store module
jest.mock("../app/Store", () => ({ __esModule: true, default: mockStore }));

// Define a function for simulating navigation
const onNavigate = (pathname) => {
  document.body.innerHTML = ROUTES({ pathname });
};

// Set up initial test environment before each test
beforeEach(() => {
  // Mock the window.localStorage and set a user in localStorage
  Object.defineProperty(window, "localStorage", { value: localStorageMock });
  window.localStorage.setItem(
    "user",
    JSON.stringify({
      type: "Employee",
      email: "employee@test.tld",
    })
  );

  // Set the initial HTML content for the NewBill page
  document.body.innerHTML = NewBillUI();
});

// Start describing the test scenarios for an employee user
describe("Given I am connected as an employee", () => {
  describe("When I am on the NewBill Page", () => {
    let newBillMock;

    beforeEach(() => {
      // Initialize the NewBill component for testing
      newBillMock = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: localStorageMock,
      });
    });

    afterEach(() => {
      // Clear all mocked function calls after each test
      jest.clearAllMocks();
    });

    // Test: File input should trigger handleChangeFile on file selection
    test("Then file input should trigger handleChangeFile on file selection", () => {
      const eventMock = { preventDefault: jest.fn() };
      const handleChangeFileSpy = jest.spyOn(newBillMock, "handleChangeFile");
      const fileInput = screen.getByTestId("file");
      const file = new File(["test"], "image.jpg", { type: "image/jpeg" });
      Object.defineProperty(fileInput, "files", { value: [file] });
      fireEvent.change(fileInput);
      newBillMock.handleChangeFile(eventMock);
      expect(handleChangeFileSpy).toHaveBeenCalled();
    });

    // Test: Adding a file with the wrong extension should display an error
    test("Then I add a file with the wrong extension, the program must return an error", async () => {
      const fileInput = screen.getByTestId("file");
      const file = new File(["test"], "image.pdf", { type: "application/pdf" });
      Object.defineProperty(fileInput, "files", { value: [file] });
      const eventMock = {
        preventDefault: jest.fn(),
        target: fileInput,
      };
      newBillMock.handleChangeFile(eventMock);

      // Use `await waitFor` to wait for the error message to appear on the screen
      await waitFor(() => {
        expect(
          screen.getByText(
            "Invalid file format. Please select a JPG, JPEG, or PNG file"
          )
        ).toBeInTheDocument();
      });
    });

    // Test: A form with 8 fields should be rendered
    test("Then a form with nine fields should be rendered", () => {
      const form = screen.getByTestId("form-new-bill");
      const fields = form.querySelectorAll(
        "input, select, textarea, [required]"
      );
      expect(fields).toHaveLength(8);
    });
  });
});

// Describe integration test scenarios for the NewBill page
describe("NewBill Integration Test Suites", () => {
  describe("Given I am a user connected as an employee", () => {
    describe("When I am on NewBill", () => {
      // Test: Submitting a completed NewBill form should redirect to the Bill page (handleSubmit())
      test("Then I submit a completed NewBill form and I am redirected to the Bill page", async () => {
        // Set up HTML content for router and navigate to the NewBill page
        document.body.innerHTML = '<div id="root"></div>';
        router();
        onNavigate(ROUTES_PATH.NewBill);

        // Get form input elements and fill them with test data
        const expenseType = screen.getByTestId("expense-type");
        const expenseName = screen.getByTestId("expense-name");
        const datepicker = screen.getByTestId("datepicker");
        const amount = screen.getByTestId("amount");
        const vat = screen.getByTestId("vat");
        const pct = screen.getByTestId("pct");
        const commentary = screen.getByTestId("commentary");
        const fileInput = screen.getByTestId("file");

        fireEvent.change(expenseType, { target: { value: "Transports" } });
        fireEvent.input(expenseName, { target: { value: "vol" } });
        fireEvent.input(datepicker, { target: { value: "2022-08-22" } });
        fireEvent.input(amount, { target: { value: "300" } });
        fireEvent.input(vat, { target: { value: "40" } });
        fireEvent.input(pct, { target: { value: "50" } });
        fireEvent.input(commentary, { target: { value: "Some comment" } });
        fireEvent.change(fileInput, {
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

        // Add event listener for form submission and trigger form submission
        const handleSubmit = jest.fn((e) => newBillEmulation.handleSubmit(e));
        formSubmission.addEventListener("submit", handleSubmit);
        fireEvent.submit(formSubmission);

        // Assert that handleSubmit was called
        expect(handleSubmit).toHaveBeenCalled();

        // Wait for the page to redirect and check for the presence of the target element
        await waitFor(() => {
          expect(screen.getByText("Mes notes de frais")).toBeInTheDocument();
        });

        // Verify the presence of a button on the redirected page
        expect(screen.getByTestId("btn-new-bill")).toBeTruthy();
      });
    });
  });
});
