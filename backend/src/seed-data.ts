import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { initDatabase, db } from './database';

// Generate 50 diverse prospects
function generateProspects() {
  const firstNames = ['Sarah', 'Michael', 'Emily', 'David', 'Lisa', 'James', 'Amanda', 'Robert', 'Jennifer', 'Daniel',
    'Jessica', 'Matthew', 'Ashley', 'Christopher', 'Michelle', 'Joshua', 'Melissa', 'Andrew', 'Stephanie', 'Kevin',
    'Nicole', 'Brian', 'Rachel', 'Ryan', 'Laura', 'Eric', 'Rebecca', 'Steven', 'Amy', 'Thomas',
    'Angela', 'Jason', 'Kimberly', 'Mark', 'Sandra', 'Joseph', 'Maria', 'Timothy', 'Nancy', 'William',
    'Elizabeth', 'Charles', 'Patricia', 'Richard', 'Linda', 'Paul', 'Barbara', 'Peter', 'Susan', 'George'];

  const lastNames = ['Johnson', 'Chen', 'Rodriguez', 'Kim', 'Martinez', 'Wilson', 'Lee', 'Taylor', 'Anderson', 'Thompson',
    'Garcia', 'Miller', 'Davis', 'Brown', 'Moore', 'Jackson', 'Martin', 'White', 'Harris', 'Clark',
    'Lewis', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Lopez', 'Hill', 'Scott',
    'Green', 'Adams', 'Baker', 'Nelson', 'Carter', 'Mitchell', 'Roberts', 'Turner', 'Phillips', 'Campbell',
    'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan'];

  const companies = ['TechCorp Solutions', 'Growth.io', 'DataSoft Inc', 'Cloud Ventures', 'FinTech.io',
    'Enterprise Systems Co', 'Startup AI', 'MarketingTech Solutions', 'InnovateLab', 'Digital Dynamics',
    'Quantum Systems', 'Cyber Solutions', 'Smart Analytics', 'Future Tech', 'Global Software',
    'Prime Data', 'Elite Cloud', 'Nexus Tech', 'Apex Solutions', 'Vertex Systems',
    'Summit Digital', 'Fusion Tech', 'Catalyst Group', 'Pioneer Tech', 'Velocity Labs',
    'Horizon Systems', 'Zenith Corp', 'Pulse Technologies', 'Matrix Solutions', 'Phoenix Digital',
    'Stellar Tech', 'Optimus Data', 'Unity Systems', 'Atlas Software', 'Omega Cloud',
    'Infinity Labs', 'Prime Systems', 'Vortex Tech', 'Nexgen Solutions', 'Quantum Labs',
    'Crystal Systems', 'Summit Software', 'Apex Data', 'Vertex Cloud', 'Catalyst Tech',
    'Pioneer Systems', 'Velocity Corp', 'Horizon Labs', 'Zenith Tech', 'Pulse Systems'];

  const roles = ['VP of Sales', 'Director of Revenue Operations', 'Head of Sales', 'VP of Business Development',
    'Director of Sales', 'Chief Revenue Officer', 'Founder & CEO', 'VP of Sales & Marketing',
    'Sales Director', 'Business Development Manager', 'Chief Sales Officer', 'VP of Growth',
    'Head of Business Development', 'Director of Customer Success', 'VP of Revenue',
    'Sales Manager', 'Chief Marketing Officer', 'Director of Operations', 'Head of Partnerships',
    'VP of Enterprise Sales', 'Director of Strategic Accounts', 'Chief Business Officer'];

  const industries = ['Technology', 'SaaS', 'Data Analytics', 'Cloud Services', 'Financial Technology',
    'Enterprise Software', 'Artificial Intelligence', 'Marketing Technology', 'Cybersecurity',
    'Healthcare Tech', 'E-commerce', 'IoT', 'Blockchain', 'DevOps', 'Mobile Apps',
    'Business Intelligence', 'Machine Learning', 'Digital Marketing', 'HR Tech', 'EdTech'];

  const prospects = [];

  for (let i = 0; i < 50; i++) {
    const firstName = firstNames[i];
    const lastName = lastNames[i];
    const company = companies[i];
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, '')}.com`;
    const role = roles[i % roles.length];
    const industry = industries[i % industries.length];
    const company_size = [45, 80, 120, 150, 180, 200, 220, 250, 280, 320, 350, 400, 450, 500, 600, 750, 850, 1000, 1200, 1500][i % 20];

    prospects.push({
      name,
      email,
      phone: '+972525703444',
      company,
      role,
      industry,
      company_size,
    });
  }

  return prospects;
}

const demoProspects = generateProspects();

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

    // Create test user
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash('test123', 10);

    // Delete any existing users
    db.prepare('DELETE FROM users').run();

    db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)').run(
      userId,
      'test',
      hashedPassword
    );

    console.log('✓ Created test user');
    console.log('  Username: test');
    console.log('  Password: test123\n');

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
    console.log('  Username: test');
    console.log('  Password: test123\n');
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
