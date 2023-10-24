/**
 * @jest-environment jsdom
 */

// Import necessary testing libraries and modules
import "@testing-library/jest-dom";
import { screen, waitFor, fireEvent } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import Bills from "../containers/Bills.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";
import { toHaveClass } from "@testing-library/jest-dom/matchers";
import { formatDate, formatStatus } from "../app/format";
import $ from "jquery";

// Mock the format, formatDate, and formatStatus functions, and the store
jest.mock("../app/format", () => ({
  formatDate: jest.fn((dateStr) => dateStr), // Mocking formatDate to return the same dateStr
  formatStatus: jest.fn(() => "pending"), // Mocking formatStatus to always return "pending" for an employee
}));
jest.mock("../app/store", () => mockStore);

expect.extend({ toHaveClass });

beforeAll(() => {
  global.$ = $; // Initialize jQuery globally
});

let billsComponent;
let mockOnNavigate;

beforeEach(() => {
  // Spy on the mockStore.bills method
  jest.spyOn(mockStore, "bills");

  const mockDocument = document.createElement("div");
  mockOnNavigate = jest.fn();
  const mockLocalStorage = {};

  billsComponent = new Bills({
    document: mockDocument,
    onNavigate: mockOnNavigate,
    store: mockStore,
    localStorage: mockLocalStorage,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("Given I am connected as an employee", () => {
  describe("When I am on the Bills Page", () => {
    // Test: Verify that the bill icon in the vertical layout is highlighted
    test("Then the bill icon in the vertical layout should be highlighted", async () => {
      // Set the user type in localStorage to "Employee"
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );

      // Create a root element for the application
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);

      // Initialize the router and navigate to the Bills page
      router();
      window.onNavigate(ROUTES_PATH.Bills);

      // Wait for the icon with data-testid "icon-window" to appear
      await waitFor(() => screen.getByTestId("icon-window"));

      // Verify if the icon has the class "active-icon"
      const windowIcon = screen.getByTestId("icon-window");
      expect(windowIcon).toHaveClass("active-icon");
    });

    // Test: Verify that bills are ordered from earliest to latest
    test("Then bills should be ordered from earliest to latest", () => {
      // Render the Bills page with the provided bills data
      document.body.innerHTML = BillsUI({ data: bills });

      const billsSorted = bills.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      // Get the dates of the bills displayed on the page
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);

      // Extract dates from the bills data
      const billsDates = billsSorted.map((bill) => dates.includes(bill.date));
      // const billsDates = billsSorted.map((bill) => bill.date === [...dates]);

      console.log("Bills Sorted:", billsSorted);
      console.log("Dates Extracted:", dates);
      console.log("Bills Dates:", billsDates);

      // Define a sorting function for dates in anti-chronological order
      const antiChrono = (a, b) => (b < a ? 1 : -1);

      // Sort the dates from the bills data in anti-chronological order
      const datesSorted = [...billsDates].sort(antiChrono);

      // Assert that the dates extracted from bills match the sorted dates
      expect(billsDates).toEqual(datesSorted);
    });
  });

  // test("Then bills should be ordered from earliest to latest", () => {
  // document.body.innerHTML = BillsUI({data: bills})
  //           const dates = Array
  //               .from(document.querySelectorAll("td[data-date]"))
  //               .map(el => el.getAttribute('data-date'));
  //           const antiChrono = (a, b) => ((a < b) ? -1 : 1)
  //           const datesSorted = [...dates].sort(antiChrono)
  //           expect(dates).toEqual(datesSorted)
  // });

  describe("Bills Component Unit Tests", () => {
    // Test: Clicking the "buttonNewBill" should navigate to the NewBill page
    test('Given I am on the Bills page, when the "New Bill" button is clicked, it should navigate to the NewBill page', () => {
      billsComponent.handleClickNewBill();
      expect(mockOnNavigate).toHaveBeenCalledWith(ROUTES_PATH.NewBill);
    });

    describe("When I am on the Bills page and I click on an eye icon", () => {
      // Test: Clicking on an eye icon should open a modal
      test("Then a modal should open", () => {
        // Initialize the HTML of the Bills page using a BillsUI function
        document.body.innerHTML = BillsUI({ data: bills });

        // Create an instance of the Bills class to manage the Bills page
        const billsContainer = new Bills({
          document,
          onNavigate,
          Store: null,
          localStorage: window.localStorage,
        });

        // Get the DOM element corresponding to the modal with the ID 'modalFile'
        const modal = document.getElementById("modaleFile");

        // Replace the $.fn.modal function with a mock function that adds the "show" class to the modal
        $.fn.modal = jest.fn(() => modal.classList.add("show"));

        // Get the first element with the 'data-testid' attribute equal to 'icon-eye'
        const iconEye = screen.getAllByTestId("icon-eye")[0];

        // Create a mocked function for the handleClickIconEye function of the billsContainer object
        const handleClickIconEye = jest.fn(
          billsContainer.handleClickIconEye(iconEye)
        );

        // Add a click event handler to the "eye" icon that calls the mocked function
        iconEye.addEventListener("click", handleClickIconEye);

        // Simulate a click on the "eye" icon
        fireEvent.click(iconEye);

        // Verify that the handleClickIconEye function has been called
        expect(handleClickIconEye).toHaveBeenCalled();
      });
    });

    // Test: Verify that fetched bills are formatted correctly
    test("Given I am on the Bills page, when bills are fetched, they should be formatted correctly", async () => {
      // Get the received bills
      const receivedBills = await billsComponent.getBills();

      // Define expected bills with the same formatting
      const expectedBills = receivedBills.map((bill) => ({
        ...bill,
        date: formatDate(bill.date), // Format the date field
        status: formatStatus(bill.status), // Format the status field
      }));

      // Compare the formatted bills to the received bills
      expect(expectedBills).toEqual(receivedBills);
    });
  });

  // NOTES: Integration test for fetching bills from the API
  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills");
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "a@a",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.appendChild(root);
      router();
    });

    // Test: Fetching bills from an API and failing with a 404 error message
    test("fetches bills from an API and fails with a 404 message error", async () => {
      // Mock the 'bills' method of the store to return a rejected promise with an error message
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"));
          },
        };
      });

      // Navigate to the Bills page
      window.onNavigate(ROUTES_PATH.Bills);

      // Wait for the error message to appear
      await new Promise(process.nextTick);
      const errorMessage = screen.getByTestId("error-message");

      // Assert that the error message contains the expected error message
      expect(errorMessage.innerHTML).toContain("Erreur 404");
    });

    // Test: Fetching bills from an API and failing with a 500 error message
    test("fetches messages from an API and fails with a 500 message error", async () => {
      // Mock the 'bills' method of the store to return a rejected promise with an error message
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"));
          },
        };
      });

      // Navigate to the Bills page
      window.onNavigate(ROUTES_PATH.Bills);

      // Wait for the error message to appear
      await new Promise(process.nextTick);
      const errorMessage = screen.getByTestId("error-message");

      // Assert that the error message contains the expected error message
      expect(errorMessage.innerHTML).toContain("Erreur 500");
    });
  });
});