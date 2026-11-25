import bcrypt from 'bcryptjs';
import { db } from './db.js';

export async function seedInitialData() {
  const users = db.getCollection('users');
  const adminExists = users.find(u => u.username.toUpperCase() === 'ADMIN');

  if (!adminExists) {
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    const adminUser = {
      id: 'usr-admin-001',
      username: 'ADMIN',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'APPROVED',
      fullName: 'System Administrator',
      email: 'admin@techsavvies.com',
      phone: '',
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.insert('users', adminUser);
    console.log('Seeded default ADMIN user');
  }

  // Seed default system settings
  const currentSettings = db.getSettings();
  if (!currentSettings.companyName) {
    db.updateSettings({
      companyName: 'Tech Savvies',
      tagline: 'Business Software Solution Provider',
      supportEmail: 'support.techsavvies@gmail.com',
      supportPhone: '',
      address: '',
      defaultCurrency: 'USD ($)',
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        user: 'support.techsavvies@gmail.com',
        from: 'Tech Savvies Support <support.techsavvies@gmail.com>',
        enabled: true,
        simulationMode: true
      }
    });
  } else if (currentSettings.smtp?.user === 'alerts@techsavvies.com' || currentSettings.supportEmail === 'support@techsavvies.com') {
    db.updateSettings({
      supportEmail: 'support.techsavvies@gmail.com',
      smtp: {
        ...currentSettings.smtp,
        host: 'smtp.gmail.com',
        port: 587,
        user: 'support.techsavvies@gmail.com',
        from: 'Tech Savvies Support <support.techsavvies@gmail.com>'
      }
    });
  }
}
