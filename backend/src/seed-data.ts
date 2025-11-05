import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { initDatabase, db } from './database';

const demoProspects = [
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '+972525703444',
    company: 'TechCorp Solutions',
    role: 'VP of Sales',
    industry: 'Technology',
    company_size: 250,
  },
  {
    name: 'Michael Chen',
    email: 'michael.chen@growth.io',
    phone: '+972525703444',
    company: 'Growth.io',
    role: 'Director of Revenue Operations',
    industry: 'SaaS',
    company_size: 150,
  },
  {
    name: 'Emily Rodriguez',
    email: 'emily.r@datasoft.com',
    phone: '+972525703444',
    company: 'DataSoft Inc',
    role: 'Head of Sales',
    industry: 'Data Analytics',
    company_size: 400,
  },
  {
    name: 'David Kim',
    email: 'dkim@cloudventures.com',
    phone: '+972525703444',
    company: 'Cloud Ventures',
    role: 'VP of Business Development',
    industry: 'Cloud Services',
    company_size: 180,
  },
  {
    name: 'Lisa Martinez',
    email: 'lisa.m@fintech.io',
    phone: '+972525703444',
    company: 'FinTech.io',
    role: 'Director of Sales',
    industry: 'Financial Technology',
    company_size: 320,
  },
  {
    name: 'James Wilson',
    email: 'jwilson@enterprise.com',
    phone: '+972525703444',
    company: 'Enterprise Systems Co',
    role: 'Chief Revenue Officer',
    industry: 'Enterprise Software',
    company_size: 600,
  },
  {
    name: 'Amanda Lee',
    email: 'alee@startup.ai',
    phone: '+972525703444',
    company: 'Startup AI',
    role: 'Founder & CEO',
    industry: 'Artificial Intelligence',
    company_size: 45,
  },
  {
    name: 'Robert Taylor',
    email: 'rtaylor@marketing.tech',
    phone: '+972525703444',
    company: 'MarketingTech Solutions',
    role: 'VP of Sales & Marketing',
    industry: 'Marketing Technology',
    company_size: 220,
  },
];

const demoCampaigns = [
  {
    name: 'Q1 2025 - Enterprise Tech Outbound',
    status: 'active',
    target_count: 50,
    completed_count: 12,
    success_rate: 0.25,
  },
  {
    name: 'SaaS Growth Campaign',
    status: 'active',
    target_count: 30,
    completed_count: 8,
    success_rate: 0.30,
  },
  {
    name: 'Pilot Campaign - Technology Sector',
    status: 'completed',
    target_count: 20,
    completed_count: 20,
    success_rate: 0.35,
  },
];

async function seedDatabase() {
  console.log('🌱 Seeding database...\n');

  try {
    // Initialize database
    initDatabase();

    // Create demo user
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash('demo123', 10);

    db.prepare('DELETE FROM users WHERE username = ?').run('demo');

    db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)').run(
      userId,
      'demo',
      hashedPassword
    );

    console.log('✓ Created demo user');
    console.log('  Username: demo');
    console.log('  Password: demo123\n');

    // Seed prospects
    console.log('📋 Seeding prospects...');

    for (const prospect of demoProspects) {
      const id = uuidv4();
      db.prepare(
        `INSERT INTO prospects (id, name, email, phone, company, role, industry, company_size, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')`
      ).run(
        id,
        prospect.name,
        prospect.email,
        prospect.phone,
        prospect.company,
        prospect.role,
        prospect.industry,
        prospect.company_size
      );

      console.log(`  ✓ ${prospect.name} - ${prospect.company}`);
    }

    console.log(`\n✓ Created ${demoProspects.length} prospects\n`);

    // Seed campaigns
    console.log('📊 Seeding campaigns...');

    for (const campaign of demoCampaigns) {
      const id = uuidv4();
      db.prepare(
        `INSERT INTO campaigns (id, name, status, target_count, completed_count, success_rate)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        campaign.name,
        campaign.status,
        campaign.target_count,
        campaign.completed_count,
        campaign.success_rate
      );

      console.log(`  ✓ ${campaign.name}`);
    }

    console.log(`\n✓ Created ${demoCampaigns.length} campaigns\n`);

    console.log('✨ Database seeded successfully!\n');
    console.log('You can now login with:');
    console.log('  Username: demo');
    console.log('  Password: demo123\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

export { seedDatabase };
