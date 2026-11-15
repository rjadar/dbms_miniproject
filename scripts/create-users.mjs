import bcrypt from 'bcryptjs';
import pg from 'pg';
const {Pool}=pg;
if(!process.env.DATABASE_URL || !process.env.ADMIN_PASSWORD || !process.env.DEVELOPER_PASSWORD) throw new Error('Set DATABASE_URL, ADMIN_PASSWORD and DEVELOPER_PASSWORD in .env');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
try {
  for(const [email,password,role] of [[process.env.ADMIN_EMAIL||'admin@example.edu',process.env.ADMIN_PASSWORD,'admin'],[process.env.DEVELOPER_EMAIL||'developer@example.edu',process.env.DEVELOPER_PASSWORD,'developer']]) {
    const hash=await bcrypt.hash(password,12);
    await pool.query('INSERT INTO app_users(email,password_hash,role) VALUES($1,$2,$3) ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,role=EXCLUDED.role',[email.toLowerCase(),hash,role]);
    console.log(`Created ${role} account: ${email.toLowerCase()}`);
  }
} finally { await pool.end(); }
