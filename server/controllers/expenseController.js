import mongoose from "mongoose";

import Expense from "../models/Expense.js";
import PG from "../models/PG.js";


// --------------------------------------------------
// GET MY EXPENSES
// --------------------------------------------------

export const getMyExpenses = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const { pgId, category } = req.query;

    const filter = {
      ownerId,
    };

    // Optional PG filter
    if (pgId) {
      if (!mongoose.Types.ObjectId.isValid(pgId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid PG ID",
        });
      }

      const pg = await PG.findOne({
        _id: pgId,
        ownerId,
      });

      if (!pg) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this PG",
        });
      }

      filter.pgId = pgId;
    }

    // Optional category filter
    if (category && category !== "all") {
      filter.category = category;
    }

    const expenses = await Expense.find(filter)
      .populate("pgId", "name city")
      .sort({
        expenseDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: expenses.length,
      expenses,
    });
  } catch (error) {
    console.error("Get expenses error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
    });
  }
};


// --------------------------------------------------
// GET EXPENSE SUMMARY
// --------------------------------------------------

export const getExpenseSummary = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const { pgId } = req.query;

    const filter = {
      ownerId,
    };

    if (pgId) {
      if (!mongoose.Types.ObjectId.isValid(pgId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid PG ID",
        });
      }

      const pg = await PG.findOne({
        _id: pgId,
        ownerId,
      });

      if (!pg) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this PG",
        });
      }

      filter.pgId = pgId;
    }

    const expenses = await Expense.find(filter);

    const totalExpenses = expenses.reduce(
      (total, expense) => total + expense.amount,
      0
    );

    const expenseCount = expenses.length;

    const thisMonth = new Date();

    const monthStart = new Date(
      thisMonth.getFullYear(),
      thisMonth.getMonth(),
      1
    );

    const monthEnd = new Date(
      thisMonth.getFullYear(),
      thisMonth.getMonth() + 1,
      1
    );

    const monthlyExpenses = expenses.filter((expense) => {
      const date = new Date(expense.expenseDate);

      return date >= monthStart && date < monthEnd;
    });

    const monthlyTotal = monthlyExpenses.reduce(
      (total, expense) => total + expense.amount,
      0
    );

    // Category totals
    const categoryTotals = {};

    expenses.forEach((expense) => {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = 0;
      }

      categoryTotals[expense.category] += expense.amount;
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalExpenses,
        expenseCount,
        monthlyTotal,
        monthlyCount: monthlyExpenses.length,
        categoryTotals,
      },
    });
  } catch (error) {
    console.error("Expense summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch expense summary",
    });
  }
};


// --------------------------------------------------
// CREATE EXPENSE
// --------------------------------------------------

export const createExpense = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const {
      pgId,
      title,
      category,
      amount,
      expenseDate,
      paymentMethod,
      notes,
    } = req.body;

    if (
      !pgId ||
      !title ||
      amount === undefined ||
      amount === null ||
      !expenseDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "PG, title, amount and expense date are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(pgId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PG ID",
      });
    }

    const numericAmount = Number(amount);

    if (
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    // Make sure PG belongs to logged-in owner
    const pg = await PG.findOne({
      _id: pgId,
      ownerId,
    });

    if (!pg) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this PG",
      });
    }

    const expense = await Expense.create({
      ownerId,
      pgId,
      title: title.trim(),
      category: category || "other",
      amount: numericAmount,
      expenseDate,
      paymentMethod: paymentMethod || "cash",
      notes: notes || "",
    });

    const populatedExpense = await Expense.findById(
      expense._id
    ).populate("pgId", "name city");

    return res.status(201).json({
      success: true,
      message: "Expense added successfully",
      expense: populatedExpense,
    });
  } catch (error) {
    console.error("Create expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create expense",
    });
  }
};


// --------------------------------------------------
// UPDATE EXPENSE
// --------------------------------------------------

export const updateExpense = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const { expenseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(expenseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const {
      pgId,
      title,
      category,
      amount,
      expenseDate,
      paymentMethod,
      notes,
    } = req.body;

    const expense = await Expense.findOne({
      _id: expenseId,
      ownerId,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (pgId) {
      if (!mongoose.Types.ObjectId.isValid(pgId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid PG ID",
        });
      }

      const pg = await PG.findOne({
        _id: pgId,
        ownerId,
      });

      if (!pg) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this PG",
        });
      }

      expense.pgId = pgId;
    }

    if (title !== undefined) {
      expense.title = title.trim();
    }

    if (category !== undefined) {
      expense.category = category;
    }

    if (amount !== undefined) {
      const numericAmount = Number(amount);

      if (
        Number.isNaN(numericAmount) ||
        numericAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Amount must be greater than 0",
        });
      }

      expense.amount = numericAmount;
    }

    if (expenseDate !== undefined) {
      expense.expenseDate = expenseDate;
    }

    if (paymentMethod !== undefined) {
      expense.paymentMethod = paymentMethod;
    }

    if (notes !== undefined) {
      expense.notes = notes;
    }

    await expense.save();

    const updatedExpense = await Expense.findById(
      expense._id
    ).populate("pgId", "name city");

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    console.error("Update expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update expense",
    });
  }
};


// --------------------------------------------------
// DELETE EXPENSE
// --------------------------------------------------

export const deleteExpense = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const { expenseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(expenseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findOneAndDelete({
      _id: expenseId,
      ownerId,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Delete expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete expense",
    });
  }
};