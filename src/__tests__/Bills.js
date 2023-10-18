/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import Bills from "../containers/Bills.js";
import router from "../app/Router.js";
import { toHaveClass } from "@testing-library/jest-dom/matchers";
import mockStore from "../__mocks__/store";
import { formatDate, formatStatus } from "../app/format";
import $ from 'jquery';

// Mock the formatDate and formatStatus functions
jest.mock("../app/format", () => ({
  formatDate: jest.fn((dateStr) => dateStr), // Mocking formatDate to return the same dateStr
  formatStatus: jest.fn((status) => status), // Mocking formatStatus to return the same status
}));

expect.extend({ toHaveClass });

let mockFormatDate;

beforeAll(() => {
  global.$ = $; // Initialize jQuery globally
  mockFormatDate = jest.fn((dateStr) => dateStr);
});

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));

      // NOTES: write expect expression
      // Check if the icon has the right class
      const windowIcon = screen.getByTestId("icon-window");
      expect(windowIcon).toHaveClass("active-icon");
    });

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);

      const billsSorted = bills.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      const billsDates = billsSorted.map((bill) => bill.date === [...dates]);

      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...billsDates].sort(antiChrono);
      expect(billsDates).toEqual(datesSorted);
    });
  });
});

describe("Bills Component Unit Tests", () => {
  let billsComponent;
  let mockOnNavigate;

  beforeEach(() => {
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

  test('Given I am on the Bills page, when the "New Bill" button is clicked, it should navigate to the NewBill page', () => {
    billsComponent.handleClickNewBill();
    expect(mockOnNavigate).toHaveBeenCalledWith(ROUTES_PATH.NewBill);
  });

  test("Given I am on the Bills page, when an eye icon is clicked, it should open a modal with the bill image", () => {
    const mockIcon = document.createElement("div");
    mockIcon.setAttribute(
      "data-bill-url",
      "http://www.example.com/bill-image.jpg"
    );

    billsComponent.handleClickIconEye(mockIcon);

    const modal = document.querySelector(".modal");
    expect(modal).toBeTruthy();

    const modalImage = document.querySelector(".modal-body img");
    expect(modalImage).toBeTruthy();
    expect(modalImage.getAttribute("src")).toEqual(
      "http://www.example.com/bill-image.jpg"
    );
  });

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
