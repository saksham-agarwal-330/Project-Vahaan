"use client";

import { formatCurrency } from "@/lib/helper";
import { Car } from "lucide-react";
import React, { useEffect, useState } from "react";

function EmiCalculator({ price }) {
  const minDownPayment = price * 0.15; // 15% minimum down payment
  const [loanAmount] = useState(price);
  const [downPayment, setDownPayment] = useState(minDownPayment);
  const [downPaymentPercent, setDownPaymentPercent] = useState(15);
  const [interestRate] = useState(5);
  const [loanTenure, setLoanTenure] = useState(1);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  const handleDownPaymentChange = (value) => {
    const newDownPayment = Math.min(
      Math.max(value, minDownPayment),
      loanAmount
    );
    setDownPayment(newDownPayment);
    setDownPaymentPercent((newDownPayment / loanAmount) * 100);
    calculateLoan(loanAmount, newDownPayment, interestRate, loanTenure);
  };

  const handleLoanTenureChange = (value) => {
    const newTenure = Math.min(Math.max(value, 1), 20); // 1 to 20 years
    setLoanTenure(newTenure);
    calculateLoan(loanAmount, downPayment, interestRate, loanTenure);
  };

  const calculateLoan = (principal, down, rate, years) => {
    try {
      const loanPrincipal = principal - down;
      if (loanPrincipal <= 0) {
        setError("Loan amount cannot be zero or negative");
        setResults(null);
        return;
      }

      const monthlyRate = rate / 100 / 12;
      const months = years * 12;

      const emi =
        (loanPrincipal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);
      const totalPayment = emi * months;
      const totalInterest = totalPayment - loanPrincipal;

      setResults({
        emi: emi.toFixed(2),
        totalInterest: totalInterest.toFixed(2),
        totalPayment: totalPayment.toFixed(2),
        loanPrincipal: loanPrincipal.toFixed(2),
        downPayment: down.toFixed(2),
      });
      setError("");
    } catch (err) {
      setError("Error calculating loan details");
      setResults(null);
    }
  };

  useEffect(() => {
    // Initialize calculation with default values
    calculateLoan(loanAmount, minDownPayment, interestRate, loanTenure);
  }, [loanAmount, minDownPayment, interestRate, loanTenure]);


  return (
    <div className="w-full max-h-[80vh] overflow-y-auto pr-1">
      <div className="w-full">
        <div className="flex items-center mb-6">
            <Car className="h-6 w-6" />
        </div>

        <div className="space-y-1">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-inter font-semibold text-gray-900 dark:text-white mb-3">
              Vehicle Price
            </h2>
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-700 dark:text-gray-300">₹</span>
                </div>
                <input
                  value={formatCurrency(loanAmount)}
                  readOnly
                  className="w-full pl-8 pr-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-gray-900 dark:focus:border-gray-400"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-inter font-semibold text-gray-900 dark:text-white mb-3">
              Down Payment
            </h2>
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-700 dark:text-gray-300">$</span>
                </div>
                <input
                  type="number"
                  value={downPayment}
                  onChange={(e) =>
                    handleDownPaymentChange(parseFloat(e.target.value))
                  }
                  className="w-full pl-8 pr-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-gray-900 dark:focus:border-gray-400"
                />
              </div>
              <input
                type="range"
                min={minDownPayment}
                max={loanAmount}
                value={downPayment}
                onChange={(e) =>
                  handleDownPaymentChange(parseFloat(e.target.value))
                }
                className="w-full"
              />
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Down payment: {downPaymentPercent.toFixed(1)}% of vehicle price
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <h2 className="text-lg font-inter font-semibold text-gray-900 dark:text-white mb-3">
                Interest Rate
              </h2>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="number"
                    value={interestRate}
                    readOnly
                    className="w-full pr-8 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-gray-900 dark:focus:border-gray-400"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-700 dark:text-gray-300">%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <h2 className="text-lg font-inter font-semibold text-gray-900 dark:text-white mb-3">
                Loan Term
              </h2>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="number"
                    value={loanTenure}
                    onChange={(e) =>
                      handleLoanTenureChange(parseFloat(e.target.value))
                    }
                    className="w-full pr-12 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-gray-900 dark:focus:border-gray-400"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-700 dark:text-gray-300">
                      Years
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={loanTenure}
                  onChange={(e) =>
                    handleLoanTenureChange(parseFloat(e.target.value))
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-500 dark:text-red-400 text-sm mt-3">
              {error}
            </div>
          )}

          {results && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mt-4">
              <div className="text-center mb-4">
                <div className="text-sm font-inter text-gray-700 dark:text-gray-300">
                  Monthly Payment
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(results.emi)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg">
                  <div className="text-sm font-inter text-gray-700 dark:text-gray-300">
                    Vehicle Price
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(loanAmount)}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg">
                  <div className="text-sm font-inter text-gray-700 dark:text-gray-300">
                    Down Payment
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(results.downPayment)}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg">
                  <div className="text-sm font-inter text-gray-700 dark:text-gray-300">
                    Loan Amount
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(results.loanPrincipal)}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg">
                  <div className="text-sm font-inter text-gray-700 dark:text-gray-300">
                    Total Interest
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(results.totalInterest)}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg md:col-span-2">
                  <div className="text-sm font-inter text-gray-700 dark:text-gray-300">
                    Total Amount (Down Payment + Total Payments)
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    
                    {formatCurrency(
                      parseFloat(results.downPayment) +
                        parseFloat(results.totalPayment)
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-700 dark:text-gray-300 text-center font-inter">
            This is an estimate. Actual EMI may vary based on your credit score
            and lender terms.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmiCalculator;
