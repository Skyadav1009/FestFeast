/**
 * Seed Admin User Script
 * Creates the initial admin user in the database
 * 
 * Run with: node scripts/seedAdmin.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function seedAdmin() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Admin credentials
        const adminData = {
            username: 'shivam',
            password: '2K23CSUN01049',
            role: 'admin'
        };

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username: adminData.username });

        if (existingAdmin) {
            console.log(`Admin user '${adminData.username}' already exists.`);
            console.log('Updating password...');
            existingAdmin.password = adminData.password;
            await existingAdmin.save();
            console.log('Password updated successfully!');
        } else {
            // Create new admin
            const admin = new Admin(adminData);
            await admin.save();
            console.log(`Admin user '${adminData.username}' created successfully!`);
        }

        console.log('\n=== Admin Credentials ===');
        console.log(`Username: ${adminData.username}`);
        console.log(`Password: ${adminData.password}`);
        console.log('=========================\n');

    } catch (error) {
        console.error('Error seeding admin:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

seedAdmin();
